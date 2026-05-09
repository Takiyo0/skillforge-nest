import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class SanitizeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => sanitize(data)));
  }
}

function sanitize(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);

  if (typeof obj === 'object' && obj.constructor === Object) {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'passwordHash' || k === 'password_hash') continue;
      out[k] = sanitize(v);
    }
    return out;
  }

  return obj;
}
