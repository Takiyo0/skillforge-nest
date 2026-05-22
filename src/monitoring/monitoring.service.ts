import {Injectable, OnModuleDestroy, OnModuleInit} from '@nestjs/common';
import {DataSource} from 'typeorm';
import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Registry,
} from 'prom-client';
import {readFileSync} from 'fs';
import {join} from 'path';

@Injectable()
export class MonitoringService implements OnModuleInit, OnModuleDestroy {
  readonly registry = new Registry();
  readonly httpRequestsTotal = new Counter({
    name: 'skillforge_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code', 'status_class'] as const,
    registers: [this.registry],
  });
  readonly httpRequestDurationSeconds = new Histogram({
    name: 'skillforge_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
    registers: [this.registry],
  });
  readonly httpRequestSizeBytes = new Histogram({
    name: 'skillforge_http_request_size_bytes',
    help: 'HTTP request content length in bytes',
    labelNames: ['method', 'route'] as const,
    buckets: [0, 128, 512, 1024, 4096, 16384, 65536, 262144, 1048576],
    registers: [this.registry],
  });
  readonly httpResponseSizeBytes = new Histogram({
    name: 'skillforge_http_response_size_bytes',
    help: 'HTTP response content length in bytes',
    labelNames: ['method', 'route', 'status_code'] as const,
    buckets: [0, 128, 512, 1024, 4096, 16384, 65536, 262144, 1048576],
    registers: [this.registry],
  });
  readonly httpRequestsInFlight = new Gauge({
    name: 'skillforge_http_requests_in_flight',
    help: 'Number of HTTP requests currently in flight',
    labelNames: ['method', 'route'] as const,
    registers: [this.registry],
  });
  readonly httpErrorsTotal = new Counter({
    name: 'skillforge_http_errors_total',
    help: 'Total HTTP error responses',
    labelNames: ['method', 'route', 'status_code'] as const,
    registers: [this.registry],
  });
  readonly operationDurationSeconds = new Histogram({
    name: 'skillforge_operation_duration_seconds',
    help: 'Controller handler execution duration in seconds',
    labelNames: ['controller', 'handler', 'outcome'] as const,
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    registers: [this.registry],
  });
  readonly operationsTotal = new Counter({
    name: 'skillforge_operations_total',
    help: 'Total controller handler executions',
    labelNames: ['controller', 'handler', 'outcome'] as const,
    registers: [this.registry],
  });
  readonly processUptimeSeconds = new Gauge({
    name: 'skillforge_process_uptime_seconds',
    help: 'Node.js process uptime in seconds',
    registers: [this.registry],
  });
  readonly processActiveHandles = new Gauge({
    name: 'skillforge_process_active_handles',
    help: 'Approximate number of active handles in the process',
    registers: [this.registry],
  });
  readonly processActiveRequests = new Gauge({
    name: 'skillforge_process_active_requests',
    help: 'Approximate number of active requests in the process',
    registers: [this.registry],
  });
  readonly dbPoolTotalConnections = new Gauge({
    name: 'skillforge_db_pool_total_connections',
    help: 'PostgreSQL pool total connections',
    registers: [this.registry],
  });
  readonly dbPoolIdleConnections = new Gauge({
    name: 'skillforge_db_pool_idle_connections',
    help: 'PostgreSQL pool idle connections',
    registers: [this.registry],
  });
  readonly dbPoolWaitingRequests = new Gauge({
    name: 'skillforge_db_pool_waiting_requests',
    help: 'PostgreSQL pool waiting connection requests',
    registers: [this.registry],
  });
  readonly dbPoolMaxConnections = new Gauge({
    name: 'skillforge_db_pool_max_connections',
    help: 'PostgreSQL pool max configured connections',
    registers: [this.registry],
  });
  readonly buildInfo = new Gauge({
    name: 'skillforge_build_info',
    help: 'Build and runtime metadata',
    labelNames: ['version', 'node_version', 'environment'] as const,
    registers: [this.registry],
  });

  private runtimeInterval?: NodeJS.Timeout;

  constructor(private readonly dataSource: DataSource) {
    collectDefaultMetrics({
      register: this.registry,
      prefix: 'skillforge_',
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
    });
  }

  onModuleInit(): void {
    const pkg = JSON.parse(
        readFileSync(join(process.cwd(), 'package.json'), 'utf8'),
    ) as { version?: string };

    this.buildInfo
        .labels(
            pkg.version ?? 'unknown',
            process.version,
            process.env.NODE_ENV ?? 'development',
        )
        .set(1);

    this.updateRuntimeGauges();
    this.runtimeInterval = setInterval(
        () => this.updateRuntimeGauges(),
        10_000,
    );
    this.runtimeInterval.unref();
  }

  onModuleDestroy(): void {
    if (this.runtimeInterval) {
      clearInterval(this.runtimeInterval);
    }
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }

  private updateRuntimeGauges(): void {
    this.processUptimeSeconds.set(process.uptime());

    const activeHandles = (
        process as NodeJS.Process & { _getActiveHandles?: () => unknown[] }
    )._getActiveHandles?.().length;
    const activeRequests = (
        process as NodeJS.Process & { _getActiveRequests?: () => unknown[] }
    )._getActiveRequests?.().length;

    if (typeof activeHandles === 'number') {
      this.processActiveHandles.set(activeHandles);
    }
    if (typeof activeRequests === 'number') {
      this.processActiveRequests.set(activeRequests);
    }

    this.updateDbPoolGauges();
  }

  private updateDbPoolGauges(): void {
    try {
      const pool = (
          this.dataSource.driver as unknown as {
            master?: {
              totalCount?: number;
              idleCount?: number;
              waitingCount?: number;
              options?: { max?: number };
            };
          }
      ).master;

      if (!pool) return;
      if (typeof pool.totalCount === 'number')
        this.dbPoolTotalConnections.set(pool.totalCount);
      if (typeof pool.idleCount === 'number')
        this.dbPoolIdleConnections.set(pool.idleCount);
      if (typeof pool.waitingCount === 'number')
        this.dbPoolWaitingRequests.set(pool.waitingCount);
      if (typeof pool.options?.max === 'number')
        this.dbPoolMaxConnections.set(pool.options.max);
    } catch {
      // best effort only
    }
  }
}
