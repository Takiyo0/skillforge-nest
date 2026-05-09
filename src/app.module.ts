import {Module} from '@nestjs/common';
import {ConfigModule, ConfigService} from '@nestjs/config';
import {TypeOrmModule} from '@nestjs/typeorm';
import {AppController} from './app.controller';
import {AppService} from './app.service';
import {AuthModule} from './auth/auth.module';
import {UsersModule} from './users/users.module';
import {OnboardingModule} from './onboarding/onboarding.module';
import {CoursesModule} from './courses/courses.module';
import {ProgressModule} from './progress/progress.module';
import {QuizzesModule} from './quizzes/quizzes.module';
import {ExercisesModule} from './exercises/exercises.module';
import {SubmissionsModule} from './submissions/submissions.module';
import {AdminModule} from './admin/admin.module';
import {CertificateModule} from './certificates/certificate.module';
import {S3Module} from './common/s3.module';
import {BadgesModule} from './badges/badges.module';
import {LearningPathModule} from './learning-paths/learning-path.module';
import {ForumModule} from './forum/forum.module';
import {ServeStaticModule} from "@nestjs/serve-static";
import {join} from 'path';

@Module({
    imports: [
        // global configuration
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),

        ServeStaticModule.forRoot({
            rootPath: process.env.NODE_ENV === 'production' ?
                join(__dirname, 'public') :
                join(__dirname, '..', '..', 'frontend', 'dist'),
            exclude: ['/api/*path'],
        }),

        // database configuration
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get('DATABASE_HOST'),
                port: configService.get('DATABASE_PORT'),
                username: configService.get('DATABASE_USER'),
                password: configService.get('DATABASE_PASSWORD'),
                database: configService.get('DATABASE_NAME'),
                entities: [__dirname + '/**/*.entity{.ts,.js}'],
                synchronize: false, // Disabled to prevent enum issues; use migrations instead
                logging: configService.get('NODE_ENV') === 'development',
            }),
            inject: [ConfigService],
        }),

        // feature modules
        AuthModule,
        UsersModule,
        OnboardingModule,
        CoursesModule,
        ProgressModule,
        QuizzesModule,
        ExercisesModule,
        SubmissionsModule,
        AdminModule,
        CertificateModule,
        S3Module,
        BadgesModule,
        LearningPathModule,
        ForumModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {
}
