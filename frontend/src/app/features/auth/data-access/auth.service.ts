import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable, tap} from 'rxjs';
import {environment} from '../../../../environments/environment';
import {AuthResponse, AuthUser, MessageResponse} from './auth.models';

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload {
  email: string;
  password: string;
  displayName: string;
}

interface ForgotPasswordPayload {
  email: string;
}

interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiBaseUrl = environment.apiBaseUrl.replace(/\/$/, '');
  private readonly tokenKey = 'f1sets.auth.token';
  private readonly userKey = 'f1sets.auth.user';

  private readonly userSubject = new BehaviorSubject<AuthUser | null>(this.readUserFromStorage());
  readonly user$ = this.userSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiBaseUrl}/auth/login`, payload)
      .pipe(tap((response) => this.storeSession(response)));
  }

  register(payload: RegisterPayload): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiBaseUrl}/auth/register`, payload)
      .pipe(tap((response) => this.storeSession(response)));
  }

  forgotPassword(payload: ForgotPasswordPayload): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiBaseUrl}/auth/forgot-password`, payload);
  }

  resetPassword(payload: ResetPasswordPayload): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiBaseUrl}/auth/reset-password`, payload);
  }

  changePassword(payload: ChangePasswordPayload): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiBaseUrl}/auth/change-password`, payload);
  }

  getMe(): Observable<AuthUser> {
    return this.http
      .get<AuthUser>(`${this.apiBaseUrl}/auth/me`)
      .pipe(tap((user) => this.storeUser(user)));
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.userSubject.next(null);
  }

  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    return typeof token === 'string' && token.length > 0;
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getCurrentUser(): AuthUser | null {
    return this.userSubject.value;
  }

  isAdmin(): boolean {
    return this.userSubject.value?.role === 'ADMIN';
  }

  private storeSession(response: AuthResponse): void {
    localStorage.setItem(this.tokenKey, response.accessToken);
    this.storeUser(response.user);
  }

  private storeUser(user: AuthUser): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this.userSubject.next(user);
  }

  private readUserFromStorage(): AuthUser | null {
    try {
      const raw = localStorage.getItem(this.userKey);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as Partial<AuthUser>;
      if (
        typeof parsed.id !== 'number' ||
        typeof parsed.email !== 'string' ||
        typeof parsed.displayName !== 'string' ||
        (parsed.role !== undefined && parsed.role !== 'USER' && parsed.role !== 'ADMIN')
      ) {
        return null;
      }

      return {
        id: parsed.id,
        email: parsed.email,
        displayName: parsed.displayName,
        role: parsed.role === 'ADMIN' ? 'ADMIN' : 'USER',
      };
    } catch {
      return null;
    }
  }
}
