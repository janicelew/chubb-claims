import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Identity } from './identity';

/** Adds the "who is asking" headers to every call to our own API. */
export const identityInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api')) {
    return next(req);
  }
  const user = inject(Identity).user();
  return next(req.clone({ setHeaders: { 'X-User-Id': user.id, 'X-User-Role': user.role } }));
};
