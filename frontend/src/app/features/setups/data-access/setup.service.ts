import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {map, Observable} from 'rxjs';
import {environment} from '../../../../environments/environment';
import {
  PublishSetupPayload,
  SetupFieldDefinition,
  SetupFieldSchemaResponse,
  SetupItem,
  SetupListResponse,
  SetupReportItem,
  SetupReportListResponse,
  UpdateSetupPayload,
} from '../models/setup.models';

@Injectable({
  providedIn: 'root',
})
export class SetupService {
  private readonly apiBaseUrl = environment.apiBaseUrl.replace(/\/$/, '');

  constructor(private readonly http: HttpClient) {}

  searchSetups(params: {
    gameCode?: string | null;
    trackSlug?: string | null;
    query?: string | null;
    sessionType?: string | null;
    weatherCondition?: string | null;
    inputDevice?: string | null;
    page?: number;
    size?: number;
  }): Observable<SetupListResponse> {
    const search = new URLSearchParams();
    if (params.gameCode && params.gameCode.trim()) {
      search.set('gameCode', params.gameCode.trim().toLowerCase());
    }
    if (params.trackSlug && params.trackSlug.trim()) {
      search.set('trackSlug', params.trackSlug.trim().toLowerCase());
    }
    if (params.query && params.query.trim()) {
      search.set('query', params.query.trim());
    }
    if (params.sessionType && params.sessionType.trim()) {
      search.set('sessionType', params.sessionType.trim().toLowerCase());
    }
    if (params.weatherCondition && params.weatherCondition.trim()) {
      search.set('weatherCondition', params.weatherCondition.trim().toLowerCase());
    }
    if (params.inputDevice && params.inputDevice.trim()) {
      search.set('inputDevice', params.inputDevice.trim().toLowerCase());
    }
    search.set('page', String(params.page ?? 0));
    search.set('size', String(params.size ?? 25));

    return this.http.get<SetupListResponse>(
      `${this.apiBaseUrl}/public/setups?${search.toString()}`,
    );
  }

  publishSetup(payload: PublishSetupPayload): Observable<SetupItem> {
    return this.http.post<SetupItem>(`${this.apiBaseUrl}/setups`, payload);
  }

  updateSetup(setupId: number, payload: UpdateSetupPayload): Observable<SetupItem> {
    return this.http.patch<SetupItem>(`${this.apiBaseUrl}/setups/${setupId}`, payload);
  }

  deleteSetup(setupId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/setups/${setupId}`);
  }

  voteSetup(setupId: number, vote: -1 | 0 | 1): Observable<SetupItem> {
    return this.http.post<SetupItem>(`${this.apiBaseUrl}/setups/${setupId}/vote`, {vote});
  }

  reportSetup(setupId: number, reason: string): Observable<SetupReportItem> {
    return this.http.post<SetupReportItem>(`${this.apiBaseUrl}/setups/${setupId}/report`, {reason});
  }

  recommendedSetups(gameCode?: string | null, limit = 8): Observable<SetupItem[]> {
    const search = new URLSearchParams();
    if (gameCode && gameCode.trim()) {
      search.set('gameCode', gameCode.trim().toLowerCase());
    }
    search.set('limit', String(limit));
    return this.http.get<SetupItem[]>(`${this.apiBaseUrl}/setups/recommended?${search.toString()}`);
  }

  hideSetup(setupId: number, reason: string): Observable<SetupItem> {
    return this.http.post<SetupItem>(`${this.apiBaseUrl}/admin/setups/${setupId}/hide`, {reason});
  }

  unhideSetup(setupId: number): Observable<SetupItem> {
    return this.http.post<SetupItem>(`${this.apiBaseUrl}/admin/setups/${setupId}/unhide`, {});
  }

  getReports(status = 'OPEN', page = 0, size = 25): Observable<SetupReportListResponse> {
    const search = new URLSearchParams({status, page: String(page), size: String(size)});
    return this.http.get<SetupReportListResponse>(
      `${this.apiBaseUrl}/admin/setups/reports?${search.toString()}`,
    );
  }

  getSetupFieldSchema(gameCode: string): Observable<SetupFieldDefinition[]> {
    const normalizedGameCode = gameCode.trim().toLowerCase();
    return this.http
      .get<SetupFieldSchemaResponse>(
        `${this.apiBaseUrl}/public/games/${normalizedGameCode}/setup-fields`,
      )
      .pipe(map((response) => (Array.isArray(response.fields) ? response.fields : [])));
  }
}
