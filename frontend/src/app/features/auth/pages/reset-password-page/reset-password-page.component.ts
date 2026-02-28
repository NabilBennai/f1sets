import {HttpErrorResponse} from '@angular/common/http';
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {FormControl, FormGroup, Validators, ReactiveFormsModule} from '@angular/forms';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {AuthService} from '../../data-access/auth.service';

type ResetPasswordFormGroup = FormGroup<{
  token: FormControl<string>;
  newPassword: FormControl<string>;
}>;

@Component({
  selector: 'app-reset-password-page',
  templateUrl: './reset-password-page.component.html',
  styleUrl: './reset-password-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
})
export class ResetPasswordPageComponent {
  readonly form: ResetPasswordFormGroup;

  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private readonly authService: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {
    const tokenFromQuery = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.form = new FormGroup({
      token: new FormControl(tokenFromQuery, {
        nonNullable: true,
        validators: [Validators.required],
      }),
      newPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(8)],
      }),
    });
  }

  submit(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const value = this.form.getRawValue();
    this.authService
      .resetPassword({
        token: value.token.trim(),
        newPassword: value.newPassword,
      })
      .subscribe({
        next: (response) => {
          this.loading = false;
          this.successMessage = response.message;
          setTimeout(() => {
            this.router.navigateByUrl('/auth/login');
          }, 900);
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      return error.error?.message ?? 'Reset failed. The reset token may be invalid or expired.';
    }
    return 'Reset failed. Please request a new reset email.';
  }
}
