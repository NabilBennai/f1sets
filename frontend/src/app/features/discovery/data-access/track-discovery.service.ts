import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {finalize, map, Observable, of, shareReplay, tap} from 'rxjs';
import {TrackListResponse} from '../models/track.models';
import {environment} from '../../../../environments/environment';

interface TrackRequestOptions {
  forceRefresh?: boolean;
  query?: string;
  hasSetups?: boolean;
  hasLeaderboard?: boolean;
  hasAiDifficulty?: boolean;
  sort?: 'name' | 'length_asc' | 'length_desc' | 'slug';
  page?: number;
  size?: number;
}

@Injectable({
  providedIn: 'root',
})
export class TrackDiscoveryService {
  private readonly apiBaseUrl = environment.apiBaseUrl.replace(/\/$/, '');
  private readonly backendBaseUrl = this.apiBaseUrl.replace(/\/api\/v1$/, '');
  private readonly cache = new Map<string, TrackListResponse>();
  private readonly inflight = new Map<string, Observable<TrackListResponse>>();

  constructor(private readonly http: HttpClient) {}

  getTracks(gameCode: string, options?: TrackRequestOptions): Observable<TrackListResponse> {
    const normalizedCode = gameCode.trim().toLowerCase();
    if (!normalizedCode) {
      throw new Error('Game code is required');
    }

    const shouldBypassCache = options?.forceRefresh === true || this.hasServerFilters(options);
    const cacheKey = `${normalizedCode}|${options?.query ?? ''}|${options?.hasSetups ?? ''}|${options?.hasLeaderboard ?? ''}|${options?.hasAiDifficulty ?? ''}|${options?.sort ?? 'name'}|${options?.page ?? 0}|${options?.size ?? 24}`;

    if (!shouldBypassCache && this.cache.has(cacheKey)) {
      return of(this.cache.get(cacheKey)!);
    }

    if (!shouldBypassCache && this.inflight.has(cacheKey)) {
      return this.inflight.get(cacheKey)!;
    }

    const params = new URLSearchParams();
    if (options?.query && options.query.trim().length > 0) {
      params.set('query', options.query.trim());
    }
    if (options?.hasSetups) {
      params.set('hasSetups', 'true');
    }
    if (options?.hasLeaderboard) {
      params.set('hasLeaderboard', 'true');
    }
    if (options?.hasAiDifficulty) {
      params.set('hasAiDifficulty', 'true');
    }
    params.set('sort', options?.sort ?? 'name');
    params.set('page', String(options?.page ?? 0));
    params.set('size', String(options?.size ?? 24));

    const request$ = this.http
      .get<TrackListResponse>(
        `${this.apiBaseUrl}/public/games/${normalizedCode}/tracks?${params.toString()}`,
      )
      .pipe(
        map((response) => ({
          gameCode: response.gameCode?.toLowerCase() ?? normalizedCode,
          tracks: Array.isArray(response.tracks)
            ? response.tracks.map((track) => ({
                ...track,
                trackImageUrl: this.normalizeTrackImageUrl(track.trackImageUrl),
              }))
            : [],
          page: response.page ?? 0,
          size: response.size ?? 24,
          totalTracks: response.totalTracks ?? 0,
          totalPages: response.totalPages ?? 0,
        })),
        tap((response) => this.cache.set(cacheKey, response)),
        finalize(() => this.inflight.delete(cacheKey)),
        shareReplay(1),
      );

    this.inflight.set(cacheKey, request$);
    return request$;
  }

  clearCache(): void {
    this.cache.clear();
    this.inflight.clear();
  }

  private hasServerFilters(options?: TrackRequestOptions): boolean {
    if (!options) {
      return false;
    }
    return Boolean(
      (options.query && options.query.trim().length > 0) ||
      options.hasSetups ||
      options.hasLeaderboard ||
      options.hasAiDifficulty ||
      (options.sort && options.sort !== 'name') ||
      (options.page ?? 0) > 0 ||
      (options.size ?? 24) !== 24,
    );
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
