import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Identity } from './identity';
import { Role } from './models';

/** Only let these roles open a page; anyone else is sent to their own home page. */
export const roleGuard =
  (...allowed: Role[]): CanActivateFn =>
  () => {
    const identity = inject(Identity);
    return allowed.includes(identity.user().role) || inject(Router).createUrlTree([identity.homePath()]);
  };

/** "/" has no page of its own: it sends everyone to their home page. */
export const homeRedirect: CanActivateFn = () => {
  return inject(Router).createUrlTree([inject(Identity).homePath()]);
};
