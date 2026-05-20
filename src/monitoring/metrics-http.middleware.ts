import {Injectable, NestMiddleware} from '@nestjs/common';
import {NextFunction, Request, Response} from 'express';
import {MonitoringService} from './monitoring.service';

@Injectable()
export class MetricsHttpMiddleware implements NestMiddleware {
    constructor(private readonly monitoring: MonitoringService) {
    }

    use(req: Request, res: Response, next: NextFunction): void {
        if (req.path === '/metrics' || req.path === '/api/v1/metrics') {
            next();
            return;
        }

        const startedAt = process.hrtime.bigint();
        const method = req.method.toUpperCase();
        const initialRoute = this.normalizeRoute(req);

        this.monitoring.httpRequestsInFlight.inc({method, route: initialRoute});

        res.on('finish', () => {
            const route = this.normalizeRoute(req);
            const statusCode = String(res.statusCode);
            const statusClass = `${Math.floor(res.statusCode / 100)}xx`;
            const elapsedSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;

            this.monitoring.httpRequestsTotal.inc({
                method,
                route,
                status_code: statusCode,
                status_class: statusClass,
            });
            this.monitoring.httpRequestDurationSeconds.observe(
                {method, route, status_code: statusCode},
                elapsedSeconds,
            );

            const reqSize = this.toNumber(req.headers['content-length']);
            if (reqSize !== undefined) {
                this.monitoring.httpRequestSizeBytes.observe({method, route}, reqSize);
            }

            const resSize = this.toNumber(res.getHeader('content-length'));
            if (resSize !== undefined) {
                this.monitoring.httpResponseSizeBytes.observe(
                    {method, route, status_code: statusCode},
                    resSize,
                );
            }

            if (res.statusCode >= 400) {
                this.monitoring.httpErrorsTotal.inc({method, route, status_code: statusCode});
            }

            this.monitoring.httpRequestsInFlight.dec({method, route: initialRoute});
        });

        next();
    }

    private normalizeRoute(req: Request): string {
        const template = req.baseUrl && req.route?.path ? `${req.baseUrl}${req.route.path}` : req.route?.path;
        if (template) return template;
        return req.path || 'unknown';
    }

    private toNumber(value: string | number | string[] | undefined): number | undefined {
        if (Array.isArray(value)) return this.toNumber(value[0]);
        if (value == null) return undefined;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
}
