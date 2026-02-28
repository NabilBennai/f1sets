import {HttpErrorResponse} from '@angular/common/http';
import {fakeAsync, tick} from '@angular/core/testing';
import {of, throwError} from 'rxjs';
import {AuthService} from '../../data-access/auth.service';
import {ResetPasswordPageComponent} from './reset-password-page.component';

describe('ResetPasswordPageComponent', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: {navigateByUrl: jasmine.Spy};
  let routeStub: {snapshot: {queryParamMap: {get: jasmine.Spy}}};
  let component: ResetPasswordPageComponent;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', ['resetPassword']);
    routerSpy = {navigateByUrl: jasmine.createSpy('navigateByUrl')};
    routeStub = {
      snapshot: {
        queryParamMap: {
          get: jasmine.createSpy('get').and.returnValue('token-from-query'),
        },
      },
    };

    component = new ResetPasswordPageComponent(
      authServiceSpy,
      routeStub as never,
      routerSpy as never,
    );
  });

  it('initializes token from query param', () => {
    expect(component.form.getRawValue().token).toBe('token-from-query');
  });

  it('submits token/password and navigates to login after delay', fakeAsync(() => {
    authServiceSpy.resetPassword.and.returnValue(of({message: 'Password reset successful'}));
    component.form.setValue({token: '  abc  ', newPassword: 'newPassword123'});

    component.submit();

    expect(authServiceSpy.resetPassword).toHaveBeenCalledWith({
      token: 'abc',
      newPassword: 'newPassword123',
    });
    expect(component.successMessage).toBe('Password reset successful');
    expect(routerSpy.navigateByUrl).not.toHaveBeenCalled();

    tick(900);
    expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/auth/login');
  }));

  it('uses fallback message for non-http errors', () => {
    authServiceSpy.resetPassword.and.returnValue(throwError(() => new Error('boom')));
    component.form.setValue({token: 'abc', newPassword: 'newPassword123'});

    component.submit();

    expect(component.errorMessage).toBe('Reset failed. Please request a new reset email.');
  });

  it('uses API error message when provided', () => {
    authServiceSpy.resetPassword.and.returnValue(
      throwError(() => new HttpErrorResponse({error: {message: 'Token expired'}})),
    );
    component.form.setValue({token: 'abc', newPassword: 'newPassword123'});

    component.submit();

    expect(component.errorMessage).toBe('Token expired');
  });
});
