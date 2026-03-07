import {HttpErrorResponse} from '@angular/common/http';
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
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
  imports: [RouterLink, AsyncPipe, TranslateModule],
})
export class ProfilePageComponent {
  readonly vm$: Observable<ProfilePageVm>;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly profileService: ProfileService,
    private readonly authService: AuthService,
    private readonly translateService: TranslateService,
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
            errorMessage: this.translateService.instant('profile.messages.invalidId'),
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
    return languages.length > 0
      ? languages.join(', ')
      : this.translateService.instant('profile.common.notSpecified');
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 404) {
        return this.translateService.instant('profile.messages.notFound');
      }
      if (error.status === 401) {
        return this.translateService.instant('profile.messages.signInRequired');
      }
      return error.error?.message ?? this.translateService.instant('profile.messages.loadFailed');
    }
    return this.translateService.instant('profile.messages.loadFailed');
  }
}
