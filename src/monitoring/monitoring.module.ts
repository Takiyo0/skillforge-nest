import {MiddlewareConsumer, Module, NestModule} from '@nestjs/common';
import {APP_INTERCEPTOR} from '@nestjs/core';
import {MonitoringController} from './monitoring.controller';
import {MonitoringService} from './monitoring.service';
import {MetricsHttpMiddleware} from './metrics-http.middleware';
import {OperationMetricsInterceptor} from './operation-metrics.interceptor';

@Module({
  controllers: [MonitoringController],
  providers: [
    MonitoringService,
    {
      provide: APP_INTERCEPTOR,
      useClass: OperationMetricsInterceptor,
    },
  ],
  exports: [MonitoringService],
})
export class MonitoringModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(MetricsHttpMiddleware).forRoutes('*');
  }
}
