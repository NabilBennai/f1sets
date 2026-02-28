import {HttpErrorResponse} from '@angular/common/http';
import {of, throwError} from 'rxjs';
import {AuthService} from '../../data-access/auth.service';
import {LoginPageComponent} from './login-page.component';

describe('LoginPageComponent', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: {navigateByUrl: jasmine.Spy};
  let component: LoginPageComponent;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', ['login']);
    routerSpy = {
      navigateByUrl: jasmine.createSpy('navigateByUrl'),
    };
    component = new LoginPageComponent(authServiceSpy, routerSpy as never);
  });

  it('does not submit when form is invalid', () => {
    component.submit();

    expect(authServiceSpy.login).not.toHaveBeenCalled();
    expect(component.form.touched).toBeTrue();
  });

  it('submits valid credentials and navigates on success', () => {
    authServiceSpy.login.and.returnValue(
      of({
        accessToken: 'token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        user: {id: 1, email: 'user@f1sets.local', displayName: 'User', role: 'USER'},
      }),
    );
    component.form.setValue({email: 'user@f1sets.local', password: 'password123'});

    component.submit();

    expect(authServiceSpy.login).toHaveBeenCalledWith({
      email: 'user@f1sets.local',
      password: 'password123',
    });
    expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/home');
    expect(component.loading).toBeFalse();
  });

  it('sets API error message on failed login', () => {
    authServiceSpy.login.and.returnValue(
      throwError(() => new HttpErrorResponse({error: {message: 'Invalid credentials'}})),
    );
    component.form.setValue({email: 'user@f1sets.local', password: 'password123'});

    component.submit();

    expect(component.errorMessage).toBe('Invalid credentials');
    expect(component.loading).toBeFalse();
  });
});
