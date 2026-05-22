import {
    Controller,
    Get,
    Header,
    Req,
    Res,
    UnauthorizedException,
} from '@nestjs/common';
import type {Response} from 'express';
import type {Request} from 'express';
import {timingSafeEqual} from 'crypto';
import {MonitoringService} from './monitoring.service';

@Controller('metrics')
export class MonitoringController {
    constructor(private readonly monitoringService: MonitoringService) {
    }

    @Get()
    @Header(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate',
    )
    @Header('Pragma', 'no-cache')
    @Header('Expires', '0')
    async getMetrics(
        @Req() req: Request,
        @Res({passthrough: true}) res: Response,
    ): Promise<string> {
        this.assertBasicAuth(req, res);
        res.type(this.monitoringService.getContentType());
        return this.monitoringService.getMetrics();
    }

    private assertBasicAuth(req: Request, res: Response): void {
        const expectedUsername = process.env.METRICS_BASIC_AUTH_USERNAME;
        const expectedPassword = process.env.METRICS_BASIC_AUTH_PASSWORD;

        // If credentials are not configured, keep endpoint accessible (useful for local dev).
        if (!expectedUsername || !expectedPassword) {
            return;
        }

        const header = req.headers.authorization;
        if (!header || !header.startsWith('Basic ')) {
            this.raiseUnauthorized(res);
        }

        const encoded = header.slice('Basic '.length).trim();
        let decoded = '';
        try {
            decoded = Buffer.from(encoded, 'base64').toString('utf8');
        } catch {
            this.raiseUnauthorized(res);
        }

        const delimiterIndex = decoded.indexOf(':');
        if (delimiterIndex < 0) {
            this.raiseUnauthorized(res);
        }

        const username = decoded.slice(0, delimiterIndex);
        const password = decoded.slice(delimiterIndex + 1);
        const isUserMatch = this.safeEqual(username, expectedUsername);
        const isPassMatch = this.safeEqual(password, expectedPassword);

        if (!(isUserMatch && isPassMatch)) {
            this.raiseUnauthorized(res);
        }
    }

    private safeEqual(a: string, b: string): boolean {
        const aBuffer = Buffer.from(a);
        const bBuffer = Buffer.from(b);
        if (aBuffer.length !== bBuffer.length) {
            return false;
        }
        return timingSafeEqual(aBuffer, bBuffer);
    }

    private raiseUnauthorized(res: Response): never {
        res.setHeader('WWW-Authenticate', 'Basic realm="SkillForge Metrics"');
        throw new UnauthorizedException('Metrics authentication required');
    }
}
