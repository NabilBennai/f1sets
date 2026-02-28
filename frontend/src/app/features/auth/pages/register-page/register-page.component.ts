import {HttpErrorResponse} from '@angular/common/http';
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {FormControl, FormGroup, Validators, ReactiveFormsModule} from '@angular/forms';
import {Router, RouterLink} from '@angular/router';
import {AuthService} from '../../data-access/auth.service';

type RegisterFormGroup = FormGroup<{
  displayName: FormControl<string>;
  email: FormControl<string>;
  password: FormControl<string>;
}>;

@Component({
  selector: 'app-register-page',
  templateUrl: './register-page.component.html',
  styleUrl: './register-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
})
export class RegisterPageComponent {
  readonly form: RegisterFormGroup = new FormGroup({
    displayName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(100)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
  });

  loading = false;
  errorMessage = '';

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  submit(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const value = this.form.getRawValue();
    this.authService
      .register({
        displayName: value.displayName.trim(),
        email: value.email.trim(),
        password: value.password,
      })
      .subscribe({
        next: () => {
          this.loading = false;
          this.router.navigateByUrl('/home');
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage = this.resolveErrorMessage(error);
        },
      });
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      return error.error?.message ?? 'Registration failed. Please check the entered details.';
    }
    return 'Registration failed. Please try again.';
  }
}
