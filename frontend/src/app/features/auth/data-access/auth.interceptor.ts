import {HttpInterceptorFn} from '@angular/common/http';
import {inject} from '@angular/core';
import {environment} from '../../../../environments/environment';
import {AuthService} from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const apiBaseUrl = environment.apiBaseUrl.replace(/\/$/, '');
  const token = authService.getAccessToken();

  if (!token || !request.url.startsWith(apiBaseUrl)) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    }),
  );
};
