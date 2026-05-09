import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';

@Catch()
export class DbExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const message = exception && (exception.message || exception.detail || '');
    const text = (message || '').toString().toLowerCase();

    // PostgreSQL "invalid input syntax for type uuid" error
    if (text.includes('invalid input syntax') && text.includes('uuid')) {
      response.status(404).json({ ok: false, message: 'Not Found', status: 404 });
      return;
    }

    throw exception;
  }
}
