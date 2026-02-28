import {HttpClient, HttpParams} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {environment} from '../../../../environments/environment';
import {AdminLogListResponse, AdminLogQueryParams} from '../models/admin-logs.models';

@Injectable({
  providedIn: 'root',
})
export class AdminLogsService {
  private readonly apiBaseUrl = environment.apiBaseUrl.replace(/\/$/, '');

  constructor(private readonly http: HttpClient) {}

  getLogs(params: AdminLogQueryParams): Observable<AdminLogListResponse> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });
    return this.http.get<AdminLogListResponse>(`${this.apiBaseUrl}/admin/logs`, {
      params: httpParams,
    });
  }
}
