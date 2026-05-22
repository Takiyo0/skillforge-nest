import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

const SENSITIVE_KEYS = new Set([
  'passwordHash',
  'password_hash',
  'tokenHash',
  'token_hash',
  'pistonToken',
  'judge0_token',
]);

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
      if (SENSITIVE_KEYS.has(k)) continue;
      out[k] = sanitize(v);
    }
    return out;
  }

  return obj;
}
