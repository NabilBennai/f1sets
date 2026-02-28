import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import {catchError, map, of} from 'rxjs';
import {AuthService} from '../data-access/auth.service';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/auth/login']);
  }

  const currentUser = authService.getCurrentUser();
  if (currentUser?.role === 'ADMIN') {
    return true;
  }

  if (currentUser?.role === 'USER') {
    return router.createUrlTree(['/home']);
  }

  return authService.getMe().pipe(
    map((user) => (user.role === 'ADMIN' ? true : router.createUrlTree(['/home']))),
    catchError(() => of(router.createUrlTree(['/auth/login']))),
  );
};
