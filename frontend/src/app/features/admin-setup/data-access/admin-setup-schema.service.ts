import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {environment} from '../../../../environments/environment';
import {SetupFieldDefinition, SetupFieldSchemaResponse} from '../../setups/models/setup.models';

@Injectable({
  providedIn: 'root',
})
export class AdminSetupSchemaService {
  private readonly apiBaseUrl = environment.apiBaseUrl.replace(/\/$/, '');

  constructor(private readonly http: HttpClient) {}

  getSchema(gameCode: string): Observable<SetupFieldSchemaResponse> {
    const normalizedGameCode = gameCode.trim().toLowerCase();
    return this.http.get<SetupFieldSchemaResponse>(
      `${this.apiBaseUrl}/admin/games/${normalizedGameCode}/setup-fields`,
    );
  }

  saveSchema(
    gameCode: string,
    fields: SetupFieldDefinition[],
  ): Observable<SetupFieldSchemaResponse> {
    const normalizedGameCode = gameCode.trim().toLowerCase();
    return this.http.put<SetupFieldSchemaResponse>(
      `${this.apiBaseUrl}/admin/games/${normalizedGameCode}/setup-fields`,
      {fields},
    );
  }
}
