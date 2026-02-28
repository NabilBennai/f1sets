import {HttpErrorResponse} from '@angular/common/http';
import {of, throwError} from 'rxjs';
import {AuthService} from '../../data-access/auth.service';
import {ChangePasswordPageComponent} from './change-password-page.component';

describe('ChangePasswordPageComponent', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let component: ChangePasswordPageComponent;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', ['changePassword']);
    component = new ChangePasswordPageComponent(authServiceSpy);
  });

  it('rejects same current/new password without API call', () => {
    component.form.setValue({
      currentPassword: 'password123',
      newPassword: 'password123',
    });

    component.submit();

    expect(authServiceSpy.changePassword).not.toHaveBeenCalled();
    expect(component.errorMessage).toContain('different');
  });

  it('submits and resets form on success', () => {
    authServiceSpy.changePassword.and.returnValue(of({message: 'Password updated'}));
    component.form.setValue({
      currentPassword: 'password123',
      newPassword: 'newPassword123',
    });

    component.submit();

    expect(authServiceSpy.changePassword).toHaveBeenCalledWith({
      currentPassword: 'password123',
      newPassword: 'newPassword123',
    });
    expect(component.successMessage).toBe('Password updated');
    expect(component.form.getRawValue()).toEqual({currentPassword: '', newPassword: ''});
  });

  it('uses API message for HttpErrorResponse', () => {
    authServiceSpy.changePassword.and.returnValue(
      throwError(() => new HttpErrorResponse({error: {message: 'Current password invalid'}})),
    );
    component.form.setValue({
      currentPassword: 'password123',
      newPassword: 'newPassword123',
    });

    component.submit();

    expect(component.errorMessage).toBe('Current password invalid');
  });
});
