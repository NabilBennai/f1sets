import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {map, Observable} from 'rxjs';
import {environment} from '../../../../environments/environment';
import {
  AdminTrack,
  AdminTrackListResponse,
  CreateAdminTrackPayload,
  TrackPhotoUploadResponse,
  UpdateAdminTrackPayload,
} from '../models/admin-track.models';

@Injectable({
  providedIn: 'root',
})
export class AdminTrackService {
  private readonly apiBaseUrl = environment.apiBaseUrl.replace(/\/$/, '');
  private readonly backendBaseUrl = this.apiBaseUrl.replace(/\/api\/v1$/, '');

  constructor(private readonly http: HttpClient) {}

  getTracks(gameCode: string): Observable<AdminTrackListResponse> {
    const normalizedCode = gameCode.trim().toLowerCase();
    return this.http
      .get<AdminTrackListResponse>(`${this.apiBaseUrl}/admin/games/${normalizedCode}/tracks`)
      .pipe(
        map((response) => ({
          gameCode: response.gameCode?.toLowerCase() ?? normalizedCode,
          tracks: Array.isArray(response.tracks)
            ? response.tracks.map((track) => this.normalizeTrack(track))
            : [],
        })),
      );
  }

  updateTrack(trackId: number, payload: UpdateAdminTrackPayload): Observable<AdminTrack> {
    return this.http
      .patch<AdminTrack>(`${this.apiBaseUrl}/admin/tracks/${trackId}`, payload)
      .pipe(map((track) => this.normalizeTrack(track)));
  }

  createTrack(gameCode: string, payload: CreateAdminTrackPayload): Observable<AdminTrack> {
    const normalizedCode = gameCode.trim().toLowerCase();
    return this.http
      .post<AdminTrack>(`${this.apiBaseUrl}/admin/games/${normalizedCode}/tracks`, payload)
      .pipe(map((track) => this.normalizeTrack(track)));
  }

  deleteTrack(trackId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/admin/tracks/${trackId}`);
  }

  uploadTrackPhoto(trackId: number, file: File): Observable<TrackPhotoUploadResponse> {
    const formData = new FormData();
    formData.set('file', file);
    return this.http
      .post<TrackPhotoUploadResponse>(`${this.apiBaseUrl}/admin/tracks/${trackId}/photo`, formData)
      .pipe(
        map((response) => ({
          trackImageUrl: this.normalizeTrackImageUrl(response.trackImageUrl),
        })),
      );
  }

  private normalizeTrack(track: AdminTrack): AdminTrack {
    return {
      ...track,
      trackImageUrl: this.normalizeTrackImageUrl(track.trackImageUrl),
    };
  }

  private normalizeTrackImageUrl(trackImageUrl: string | null): string | null {
    if (!trackImageUrl || trackImageUrl.trim().length === 0) {
      return null;
    }

    const value = trackImageUrl.trim();
    if (value.includes('/api/v1/resources/')) {
      return value;
    }

    if (value.startsWith('tracks/')) {
      return `${this.backendBaseUrl}/api/v1/resources/${value}`;
    }

    const match = value.match(/\/f1sets\/(tracks\/.+)$/);
    if (match?.[1]) {
      return `${this.backendBaseUrl}/api/v1/resources/${match[1]}`;
    }

    return value;
  }
}
