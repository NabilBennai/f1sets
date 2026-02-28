import {HttpErrorResponse} from '@angular/common/http';
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {catchError, map, Observable, of, switchMap} from 'rxjs';
import {ProfileService} from '../../data-access/profile.service';
import {Profile} from '../../data-access/profile.models';
import {AuthService} from '../../../auth/data-access/auth.service';
import {AsyncPipe} from '@angular/common';

interface ProfilePageVm {
  loading: boolean;
  errorMessage?: string;
  profile?: Profile;
  showSettingsLink: boolean;
}

@Component({
  selector: 'app-profile-page',
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, AsyncPipe],
})
export class ProfilePageComponent {
  readonly vm$: Observable<ProfilePageVm>;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly profileService: ProfileService,
    private readonly authService: AuthService,
  ) {
    this.vm$ = this.route.paramMap.pipe(
      switchMap((params) => {
        const id = params.get('id');
        if (!id) {
          return this.profileService.getMyProfile().pipe(
            map(
              (profile) =>
                ({
                  loading: false,
                  profile,
                  showSettingsLink: true,
                }) satisfies ProfilePageVm,
            ),
            catchError((error) =>
              of({
                loading: false,
                showSettingsLink: false,
                errorMessage: this.resolveErrorMessage(error),
              } satisfies ProfilePageVm),
            ),
          );
        }

        const parsedId = Number(id);
        if (!Number.isFinite(parsedId) || parsedId <= 0) {
          return of({
            loading: false,
            showSettingsLink: false,
            errorMessage: 'Invalid profile id.',
          } satisfies ProfilePageVm);
        }

        return this.profileService.getPublicProfile(parsedId).pipe(
          map(
            (profile) =>
              ({
                loading: false,
                profile,
                showSettingsLink: this.authService.getCurrentUser()?.id === profile.userId,
              }) satisfies ProfilePageVm,
          ),
          catchError((error) =>
            of({
              loading: false,
              showSettingsLink: false,
              errorMessage: this.resolveErrorMessage(error),
            } satisfies ProfilePageVm),
          ),
        );
      }),
      map((vm) => (vm.loading === undefined ? {...vm, loading: false} : vm)),
    );
  }

  toLanguageLine(languages: string[]): string {
    return languages.length > 0 ? languages.join(', ') : 'Not specified';
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 404) {
        return 'Profile not found or not accessible.';
      }
      if (error.status === 401) {
        return 'Please sign in to view your profile.';
      }
      return error.error?.message ?? 'Unable to load profile.';
    }
    return 'Unable to load profile.';
  }
}
