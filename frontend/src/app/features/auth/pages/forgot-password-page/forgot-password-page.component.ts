import {HttpErrorResponse} from '@angular/common/http';
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {FormControl, FormGroup, Validators, ReactiveFormsModule} from '@angular/forms';
import {AuthService} from '../../data-access/auth.service';
import {RouterLink} from '@angular/router';

type ForgotPasswordFormGroup = FormGroup<{
  email: FormControl<string>;
}>;

@Component({
  selector: 'app-forgot-password-page',
  templateUrl: './forgot-password-page.component.html',
  styleUrl: './forgot-password-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
})
export class ForgotPasswordPageComponent {
  readonly form: ForgotPasswordFormGroup = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(private readonly authService: AuthService) {}

  submit(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.forgotPassword({email: this.form.getRawValue().email.trim()}).subscribe({
      next: (response) => {
        this.loading = false;
        this.successMessage = response.message;
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = this.resolveErrorMessage(error);
      },
    });
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      return error.error?.message ?? 'Unable to process password reset request.';
    }
    return 'Unable to process password reset request.';
  }
}
