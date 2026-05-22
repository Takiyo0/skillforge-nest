import {
    BadGatewayException,
    HttpException,
    InternalServerErrorException,
    ServiceUnavailableException,
} from '@nestjs/common';

type UpstreamFailureKind = 'bad_gateway' | 'unavailable';

const NETWORK_ERROR_CODES = new Set([
    'ECONNREFUSED',
    'ECONNRESET',
    'EHOSTUNREACH',
    'ENETUNREACH',
    'ETIMEDOUT',
    'UND_ERR_CONNECT_TIMEOUT',
    'UND_ERR_HEADERS_TIMEOUT',
    'UND_ERR_BODY_TIMEOUT',
    'UND_ERR_SOCKET',
]);

export class UpstreamDependencyException extends Error {
    constructor(
        readonly serviceName: string,
        readonly kind: UpstreamFailureKind,
        message?: string,
    ) {
        super(message ?? `${serviceName} request failed`);
        this.name = 'UpstreamDependencyException';
    }
}

export function rethrowIfHttpException(error: unknown): void {
    if (error instanceof HttpException) {
        throw error;
    }
}

export function mapToInternalException(
    error: unknown,
    fallbackMessage: string,
): never {
    rethrowIfHttpException(error);
    throw new InternalServerErrorException(fallbackMessage);
}

export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return 'Unknown error';
}

export function mapToUpstreamException(
    error: unknown,
    serviceName: string,
    operation: string,
): never {
    rethrowIfHttpException(error);

    if (error instanceof UpstreamDependencyException) {
        if (error.kind === 'unavailable') {
            throw new ServiceUnavailableException(
                `${serviceName} is unavailable while ${operation}`,
            );
        }

        throw new BadGatewayException(
            `${serviceName} returned an invalid response while ${operation}`,
        );
    }

    if (isNetworkAvailabilityError(error)) {
        throw new ServiceUnavailableException(
            `${serviceName} is unavailable while ${operation}`,
        );
    }

    throw new BadGatewayException(
        `${serviceName} returned an invalid response while ${operation}`,
    );
}

function isNetworkAvailabilityError(error: unknown): boolean {
    if (!(error instanceof Error)) {
        return false;
    }

    const errorWithCode = error as Error & { code?: string; cause?: unknown };
    if (errorWithCode.code && NETWORK_ERROR_CODES.has(errorWithCode.code)) {
        return true;
    }

    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        return true;
    }

    if (
        error.message.includes('fetch failed') ||
        error.message.includes('network error') ||
        error.message.includes('timed out')
    ) {
        return true;
    }

    const cause = errorWithCode.cause;
    if (cause instanceof Error) {
        const causeWithCode = cause as Error & { code?: string };
        return Boolean(
            causeWithCode.code && NETWORK_ERROR_CODES.has(causeWithCode.code),
        );
    }

    return false;
}
