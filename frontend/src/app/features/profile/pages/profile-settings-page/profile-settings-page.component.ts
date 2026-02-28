import {HttpErrorResponse} from '@angular/common/http';
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {FormControl, FormGroup, Validators, ReactiveFormsModule} from '@angular/forms';
import {ProfileService} from '../../data-access/profile.service';
import {Profile, ProfileVisibility, UpdateProfilePayload} from '../../data-access/profile.models';

type ProfileSettingsFormGroup = FormGroup<{
  firstName: FormControl<string>;
  lastName: FormControl<string>;
  dateOfBirth: FormControl<string>;
  country: FormControl<string>;
  languages: FormControl<string>;
  visibility: FormControl<ProfileVisibility>;
}>;

@Component({
  selector: 'app-profile-settings-page',
  templateUrl: './profile-settings-page.component.html',
  styleUrl: './profile-settings-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
})
export class ProfileSettingsPageComponent {
  readonly form: ProfileSettingsFormGroup = new FormGroup({
    firstName: new FormControl('', {nonNullable: true, validators: [Validators.maxLength(100)]}),
    lastName: new FormControl('', {nonNullable: true, validators: [Validators.maxLength(100)]}),
    dateOfBirth: new FormControl('', {nonNullable: true}),
    country: new FormControl('', {nonNullable: true, validators: [Validators.maxLength(100)]}),
    languages: new FormControl('', {nonNullable: true}),
    visibility: new FormControl<ProfileVisibility>('PRIVATE', {nonNullable: true}),
  });

  loading = false;
  saving = false;
  uploading = false;
  errorMessage = '';
  successMessage = '';
  avatarUrl: string | null = null;

  constructor(private readonly profileService: ProfileService) {
    this.loadProfile();
  }

  submit(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const value = this.form.getRawValue();
    const payload: UpdateProfilePayload = {
      firstName: this.toNullable(value.firstName),
      lastName: this.toNullable(value.lastName),
      dateOfBirth: this.toNullable(value.dateOfBirth),
      country: this.toNullable(value.country),
      languages: value.languages
        .split(',')
        .map((language) => language.trim())
        .filter((language) => language.length > 0),
      visibility: value.visibility,
    };

    this.profileService.updateMyProfile(payload).subscribe({
      next: (profile) => {
        this.saving = false;
        this.successMessage = 'Profile settings saved.';
        this.applyProfile(profile);
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = this.resolveErrorMessage(error);
      },
    });
  }

  onAvatarFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || this.uploading) {
      return;
    }

    this.uploading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.profileService.uploadAvatar(file).subscribe({
      next: (response) => {
        this.uploading = false;
        this.avatarUrl = response.avatarUrl;
        this.successMessage = 'Profile picture updated.';
      },
      error: (error) => {
        this.uploading = false;
        this.errorMessage = this.resolveErrorMessage(error);
      },
    });
  }

  private loadProfile(): void {
    this.loading = true;
    this.profileService.getMyProfile().subscribe({
      next: (profile) => {
        this.loading = false;
        this.applyProfile(profile);
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = this.resolveErrorMessage(error);
      },
    });
  }

  private applyProfile(profile: Profile): void {
    this.avatarUrl = profile.avatarUrl;
    this.form.reset({
      firstName: profile.firstName ?? '',
      lastName: profile.lastName ?? '',
      dateOfBirth: profile.dateOfBirth ?? '',
      country: profile.country ?? '',
      languages: profile.languages.join(', '),
      visibility: profile.visibility,
    });
  }

  private toNullable(value: string): string | null {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      return error.error?.message ?? 'Unable to update profile.';
    }
    return 'Unable to update profile.';
  }
}
