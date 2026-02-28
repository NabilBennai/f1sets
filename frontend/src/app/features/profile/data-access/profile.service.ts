import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {map, Observable} from 'rxjs';
import {environment} from '../../../../environments/environment';
import {Profile, ProfilePictureResponse, UpdateProfilePayload} from './profile.models';

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private readonly apiBaseUrl = environment.apiBaseUrl.replace(/\/$/, '');
  private readonly backendBaseUrl = this.apiBaseUrl.replace(/\/api\/v1$/, '');

  constructor(private readonly http: HttpClient) {}

  getMyProfile(): Observable<Profile> {
    return this.http
      .get<Profile>(`${this.apiBaseUrl}/profiles/me`)
      .pipe(map((profile) => this.normalizeProfile(profile)));
  }

  getPublicProfile(userId: number): Observable<Profile> {
    return this.http
      .get<Profile>(`${this.apiBaseUrl}/profiles/public/${userId}`)
      .pipe(map((profile) => this.normalizeProfile(profile)));
  }

  updateMyProfile(payload: UpdateProfilePayload): Observable<Profile> {
    return this.http
      .patch<Profile>(`${this.apiBaseUrl}/profiles/me`, payload)
      .pipe(map((profile) => this.normalizeProfile(profile)));
  }

  uploadAvatar(file: File): Observable<ProfilePictureResponse> {
    const formData = new FormData();
    formData.set('file', file);
    return this.http
      .post<ProfilePictureResponse>(`${this.apiBaseUrl}/profiles/me/avatar`, formData)
      .pipe(
        map((response) => ({
          avatarUrl: this.normalizeAvatarUrl(response.avatarUrl),
        })),
      );
  }

  private normalizeProfile(profile: Profile): Profile {
    return {
      ...profile,
      avatarUrl: this.normalizeAvatarUrl(profile.avatarUrl),
    };
  }

  private normalizeAvatarUrl(avatarUrl: string | null): string | null {
    if (!avatarUrl || avatarUrl.trim().length === 0) {
      return null;
    }

    const value = avatarUrl.trim();

    if (value.includes('/api/v1/resources/')) {
      return value;
    }

    if (value.startsWith('profiles/')) {
      return `${this.backendBaseUrl}/api/v1/resources/${value}`;
    }

    const match = value.match(/\/f1sets\/(profiles\/.+)$/);
    if (match?.[1]) {
      return `${this.backendBaseUrl}/api/v1/resources/${match[1]}`;
    }

    return value;
  }
}
