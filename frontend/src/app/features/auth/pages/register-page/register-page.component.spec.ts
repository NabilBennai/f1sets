import {HttpErrorResponse} from '@angular/common/http';
import {of, throwError} from 'rxjs';
import {AuthService} from '../../data-access/auth.service';
import {RegisterPageComponent} from './register-page.component';

describe('RegisterPageComponent', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: {navigateByUrl: jasmine.Spy};
  let component: RegisterPageComponent;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', ['register']);
    routerSpy = {
      navigateByUrl: jasmine.createSpy('navigateByUrl'),
    };
    component = new RegisterPageComponent(authServiceSpy, routerSpy as never);
  });

  it('sends trimmed displayName/email and navigates on success', () => {
    authServiceSpy.register.and.returnValue(
      of({
        accessToken: 'token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        user: {id: 2, email: 'new@f1sets.local', displayName: 'New', role: 'USER'},
      }),
    );
    component.form.setValue({
      displayName: 'New Driver',
      email: 'new@f1sets.local',
      password: 'password123',
    });

    component.submit();

    expect(authServiceSpy.register).toHaveBeenCalledWith({
      displayName: 'New Driver',
      email: 'new@f1sets.local',
      password: 'password123',
    });
    expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/home');
  });

  it('sets default message for non-http registration errors', () => {
    authServiceSpy.register.and.returnValue(throwError(() => new Error('boom')));
    component.form.setValue({
      displayName: 'New Driver',
      email: 'new@f1sets.local',
      password: 'password123',
    });

    component.submit();

    expect(component.errorMessage).toBe('Registration failed. Please try again.');
    expect(component.loading).toBeFalse();
  });

  it('uses API message for HttpErrorResponse', () => {
    authServiceSpy.register.and.returnValue(
      throwError(() => new HttpErrorResponse({error: {message: 'Email already used'}})),
    );
    component.form.setValue({
      displayName: 'New Driver',
      email: 'new@f1sets.local',
      password: 'password123',
    });

    component.submit();

    expect(component.errorMessage).toBe('Email already used');
  });
});
