import { ExceptionFilter, Catch, ArgumentsHost, BadRequestException } from '@nestjs/common';

@Catch(BadRequestException)
export class UuidNotFoundFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const resBody = exception.getResponse();
    const message = typeof resBody === 'string' ? resBody : (resBody as any).message;
    const text = Array.isArray(message) ? message.join(' ') : (message || '').toString();
    if (text.toLowerCase().includes('uuid')) {
      response.status(404).json({
        ok: false,
        message: 'Not Found',
        status: 404,
      });
      return;
    }

    // fallback to original BadRequest response but wrapped in safe format
    response.status(exception.getStatus()).json({
      ok: false,
      message: message,
      status: exception.getStatus(),
    });
  }
}
