import {
    BadGatewayException,
    ServiceUnavailableException,
} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {PistonService} from './piston.service';

describe('PistonService', () => {
    const createService = () =>
        new PistonService({
            get: jest.fn().mockReturnValue('http://piston.test'),
        } as unknown as ConfigService);

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('maps non-2xx upstream responses to BadGatewayException', async () => {
        jest.spyOn(global, 'fetch').mockResolvedValue({
            ok: false,
            status: 502,
            statusText: 'Bad Gateway',
            text: jest.fn().mockResolvedValue('upstream failed'),
        } as unknown as Response);

        const service = createService();

        await expect(
            service.executeCode({
                sourceCode: 'print("hello")',
                language: 'python',
            }),
        ).rejects.toThrow(BadGatewayException);
    });

    it('maps network failures to ServiceUnavailableException', async () => {
        jest.spyOn(global, 'fetch').mockRejectedValue(
            Object.assign(new Error('fetch failed'), {
                cause: {code: 'ECONNREFUSED'},
            }),
        );

        const service = createService();

        await expect(
            service.executeCode({
                sourceCode: 'console.log("hello")',
                language: 'javascript',
            }),
        ).rejects.toThrow(ServiceUnavailableException);
    });
});
