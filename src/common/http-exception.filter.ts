import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

interface ErrorResponse {
  ok: boolean;
  message: string | string[];
  status: number;
}

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status: number;
    let message: string | string[];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // handle validation errors
      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'message' in exceptionResponse
      ) {
        const errorObj = exceptionResponse as any;
        // extract messages from validation or custom error objects
        if (Array.isArray(errorObj.message)) {
          message = errorObj.message;
        } else if (typeof errorObj.message === 'string') {
          message = errorObj.message;
        } else if (errorObj.error) {
          message = errorObj.error;
        } else {
          message = 'An error occurred';
        }
      } else if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else {
        message = 'An error occurred';
      }

      if (status >= 500) {
        this.logger.error(
          `[${request.method}] ${request.path}: ${message}`,
          exception instanceof Error ? exception.stack : '',
        );
      } else if (status != 404) {
        this.logger.warn(`[${request.method}] ${request.path}: ${message}`);
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';

      this.logger.error(
        `[${request.method}] ${request.path}: Unhandled exception`,
        exception.stack,
      );
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      this.logger.error(`[${request.method}] ${request.path}: Unknown error`);
    }

    const errorResponse: ErrorResponse = {
      ok: false,
      message,
      status,
    };

    response.status(status).json(errorResponse);
  }
}
