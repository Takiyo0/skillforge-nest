import { NestFactory, Reflector } from '@nestjs/core';
import {
  ValidationPipe,
  Logger,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { S3HealthService } from './common/s3-health.service';
import { UuidNotFoundFilter } from './common/uuid-exception.filter';
import { DbExceptionFilter } from './common/db-exception.filter';
import { GlobalHttpExceptionFilter } from './common/http-exception.filter';
import { SanitizeInterceptor } from './common/sanitize.interceptor';
import { validateUuidMiddleware } from './common/validate-uuid.middleware';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

async function bootstrap() {
  if ((process.env.NODE_ENV || 'development') === 'production') {
    const { assertEnv } = await import('./common/env-check.js');
    assertEnv([
      'JWT_SECRET',
      'APP_BASE_URL',
      'AWS_S3_ENDPOINT',
      'PISTON_BASE_URL',
    ]);
  }
  const app = await NestFactory.create(AppModule, {
    cors: process.env.NODE_ENV !== 'production',
    logger: ['error', 'warn', 'log'],
  });

  app.setGlobalPrefix('api/v1');

  // helmet for secure headers
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: [
                    "'self'",
                    'https://static.cloudflareinsights.com',
                    'https://cdn.jsdelivr.net',
                    "'unsafe-eval'",
                ],
                styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
                imgSrc: [
                    "'self'",
                    'data:',
                    'https://cdn-sf-apac.takiyo.us',
                ],
                mediaSrc: ["'self'", 'https://cdn-sf-apac.takiyo.us'],
                fontSrc: ["'self'", 'https:', 'data:'],
                connectSrc: ["'self'", 'https://cdn.jsdelivr.net'],
                workerSrc: ["'self'", 'blob:'],
                baseUri: ["'self'"],
                formAction: ["'self'"],
                frameAncestors: ["'self'"],
                objectSrc: ["'none'"],
                scriptSrcAttr: ["'none'"],
                upgradeInsecureRequests: [],
            },
        },
    }));

  const limiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 10 * 1000, // 10 seconds
    max: Number(process.env.RATE_LIMIT_MAX) || 200, // limit each IP to 200 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/metrics' || req.path === '/api/v1/metrics',
  });
  app.use(limiter);

  // add UUID validation middleware for path params ending with 'Id'
  app.use(validateUuidMiddleware);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip properties that are not in DTO
      forbidNonWhitelisted: true, // throw error if non-whitelisted properties exist
      transform: true, // automatically transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // allow implicit type conversion
      },
    }),
  );

  // global filters and interceptors
  app.useGlobalFilters(
    new UuidNotFoundFilter(),
    new DbExceptionFilter(),
    new GlobalHttpExceptionFilter(),
  );
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
    new SanitizeInterceptor(),
  );

  const allowedOrigins = (
      process.env.CORS_ALLOWED_ORIGINS ||
      'http://localhost:6567,http://localhost:8293,https://skillforge.takiyo.us,https://skillforge.mika.kivotos.top'
  ).split(',');
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // swagger
  const config = new DocumentBuilder()
    .setTitle('SkillForge API')
    .setDescription(
      'Comprehensive API for SkillForge learning platform with courses, exercises, quizzes, and progress tracking',
    )
    .setVersion('1.0.0')
    .addServer('http://localhost:6567', 'Local Development')
    .addServer('https://skillforge.takiyo.us', 'Production Public')
    .addServer('https://skillforge.mika.kivotos.top', 'Production Internal')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token',
      },
      'access-token',
    )
    .addTag('Health', 'System health check')
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Users', 'User profile and preferences')
    .addTag('Courses', 'Course management and enrollment')
    .addTag('Units', 'Course units and lessons')
    .addTag('Exercises', 'Code exercises and submissions')
    .addTag('Quizzes', 'Quiz management and submissions')
    .addTag('Submissions', 'Exercise and quiz submission details')
    .addTag('Progress', 'Learning progress and streaks')
    .addTag('Learning Paths', 'Predefined learning paths')
    .addTag('Certificates', 'Course certificates')
    .addTag('Forum', 'Discussion forum')
    .addTag('Onboarding', 'User onboarding flow')
    .addTag('Admin - Courses', 'Admin course management')
    .addTag('Admin - Units', 'Admin unit management')
    .addTag('Admin - Exercises', 'Admin exercise management')
    .addTag('Admin - Quizzes', 'Admin quiz management')
    .addTag('Admin - Content', 'Admin module content management')
    .addTag('Admin - Final Exams', 'Admin final exam management')
    .addTag('Admin - Users', 'Admin user management')
    .addTag('Admin - Learning Paths', 'Admin learning path management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/api', app, document, {
    swaggerOptions: {
      authAction: {
        'access-token': {
          name: 'access-token',
          schema: {
            description: 'Enter your JWT token',
            type: 'apiKey',
            in: 'header',
            name: 'Authorization',
            bearerFormat: 'JWT',
          },
          value: '',
        },
      },
    },
  });

  // s3 health check
  try {
    const s3HealthService = app.get(S3HealthService);
    await s3HealthService.checkHealth();
  } catch (error) {
    const logger = new Logger('SkillForge');
    logger.warn('S3 health check failed - service may not be available');
    logger.error(error.message);
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(
    `🚀 SkillForge API is running on: http://localhost:${port}/api/v1`,
  );
}

bootstrap();
