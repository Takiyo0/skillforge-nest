import {
    BadGatewayException,
    BadRequestException,
    InternalServerErrorException,
    ServiceUnavailableException,
} from '@nestjs/common';
import {
    mapToInternalException,
    mapToUpstreamException,
    UpstreamDependencyException,
} from './runtime-exception.helper';

describe('runtime-exception.helper', () => {
    it('preserves HttpException instances for internal mapping', () => {
        const error = new BadRequestException('invalid input');

        expect(() => mapToInternalException(error, 'fallback')).toThrow(error);
    });

    it('maps unknown internal errors to InternalServerErrorException', () => {
        expect(() => mapToInternalException(new Error('boom'), 'fallback')).toThrow(
            InternalServerErrorException,
        );
    });

    it('maps upstream bad responses to BadGatewayException', () => {
        expect(() =>
            mapToUpstreamException(
                new UpstreamDependencyException('Piston', 'bad_gateway'),
                'Piston',
                'executing code',
            ),
        ).toThrow(BadGatewayException);
    });

    it('maps upstream network failures to ServiceUnavailableException', () => {
        const error = Object.assign(new Error('fetch failed'), {
            cause: {code: 'ECONNREFUSED'},
        });

        expect(() =>
            mapToUpstreamException(error, 'Ollama', 'reviewing code'),
        ).toThrow(ServiceUnavailableException);
    });
});
