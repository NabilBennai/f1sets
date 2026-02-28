import {HttpErrorResponse} from '@angular/common/http';
import {of, throwError} from 'rxjs';
import {AuthService} from '../../data-access/auth.service';
import {ForgotPasswordPageComponent} from './forgot-password-page.component';

describe('ForgotPasswordPageComponent', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let component: ForgotPasswordPageComponent;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', ['forgotPassword']);
    component = new ForgotPasswordPageComponent(authServiceSpy);
  });

  it('shows success message when request succeeds', () => {
    authServiceSpy.forgotPassword.and.returnValue(
      of({message: 'If the email exists, a reset link was sent'}),
    );
    component.form.setValue({email: 'user@f1sets.local'});

    component.submit();

    expect(authServiceSpy.forgotPassword).toHaveBeenCalledWith({email: 'user@f1sets.local'});
    expect(component.successMessage).toContain('reset link');
    expect(component.errorMessage).toBe('');
  });

  it('surfaces API error message on failure', () => {
    authServiceSpy.forgotPassword.and.returnValue(
      throwError(() => new HttpErrorResponse({error: {message: 'Rate limited'}})),
    );
    component.form.setValue({email: 'user@f1sets.local'});

    component.submit();

    expect(component.errorMessage).toBe('Rate limited');
    expect(component.loading).toBeFalse();
  });
});
