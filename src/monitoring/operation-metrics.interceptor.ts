import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import {Observable, throwError} from 'rxjs';
import {catchError, tap} from 'rxjs/operators';
import {MonitoringService} from './monitoring.service';

@Injectable()
export class OperationMetricsInterceptor implements NestInterceptor {
  constructor(private readonly monitoring: MonitoringService) {
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const controller = context.getClass().name;
    const handler = context.getHandler().name;
    const startedAt = process.hrtime.bigint();

    return next.handle().pipe(
        tap(() => this.record(controller, handler, startedAt, 'success')),
        catchError((error: unknown) => {
          this.record(controller, handler, startedAt, 'error');
          return throwError(() => error);
        }),
    );
  }

  private record(
      controller: string,
      handler: string,
      startedAt: bigint,
      outcome: 'success' | 'error',
  ): void {
    const elapsedSeconds =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
    this.monitoring.operationsTotal.inc({controller, handler, outcome});
    this.monitoring.operationDurationSeconds.observe(
        {controller, handler, outcome},
        elapsedSeconds,
    );
  }
}
