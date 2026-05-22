import { Request, Response, NextFunction } from 'express';

const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateUuidMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
) {
  const params = req.params || {};
  for (const [key, value] of Object.entries(params)) {
      if (
          typeof key === 'string' &&
          /Id$/.test(key) &&
          value &&
          typeof value === 'string'
      ) {
      if (!UUID_REGEX.test(value)) {
        return res.status(404).json({ statusCode: 404, message: 'Not Found' });
      }
    }
  }
  next();
}
