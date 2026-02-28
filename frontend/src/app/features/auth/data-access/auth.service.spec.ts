import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {provideHttpClient} from '@angular/common/http';
import {TestBed} from '@angular/core/testing';
import {AuthResponse, AuthUser} from './auth.models';
import {AuthService} from './auth.service';

describe('AuthService', () => {
  let httpMock: HttpTestingController;

  const apiBase = 'http://localhost:8080/api/v1';
  const tokenKey = 'f1sets.auth.token';
  const userKey = 'f1sets.auth.user';

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('stores token and user on login', () => {
    const service = TestBed.inject(AuthService);
    const response: AuthResponse = {
      accessToken: 'jwt-token',
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: {id: 1, email: 'user@f1sets.local', displayName: 'User', role: 'USER'},
    };

    service.login({email: 'user@f1sets.local', password: 'password123'}).subscribe();

    const req = httpMock.expectOne(`${apiBase}/auth/login`);
    expect(req.request.method).toBe('POST');
    req.flush(response);

    expect(localStorage.getItem(tokenKey)).toBe('jwt-token');
    expect(service.getCurrentUser()?.email).toBe('user@f1sets.local');
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('stores session on register', () => {
    const service = TestBed.inject(AuthService);
    const response: AuthResponse = {
      accessToken: 'register-token',
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: {id: 2, email: 'new@f1sets.local', displayName: 'New', role: 'USER'},
    };

    service
      .register({email: 'new@f1sets.local', password: 'password123', displayName: 'New'})
      .subscribe();

    const req = httpMock.expectOne(`${apiBase}/auth/register`);
    expect(req.request.method).toBe('POST');
    req.flush(response);

    expect(service.getAccessToken()).toBe('register-token');
    expect(service.getCurrentUser()?.email).toBe('new@f1sets.local');
  });

  it('calls forgot/reset/change-password endpoints', () => {
    const service = TestBed.inject(AuthService);

    service.forgotPassword({email: 'user@f1sets.local'}).subscribe();
    service.resetPassword({token: 'abc', newPassword: 'newPassword123'}).subscribe();
    service
      .changePassword({currentPassword: 'currentPassword123', newPassword: 'nextPassword123'})
      .subscribe();

    const forgotReq = httpMock.expectOne(`${apiBase}/auth/forgot-password`);
    expect(forgotReq.request.method).toBe('POST');
    forgotReq.flush({message: 'ok'});

    const resetReq = httpMock.expectOne(`${apiBase}/auth/reset-password`);
    expect(resetReq.request.method).toBe('POST');
    resetReq.flush({message: 'ok'});

    const changeReq = httpMock.expectOne(`${apiBase}/auth/change-password`);
    expect(changeReq.request.method).toBe('POST');
    changeReq.flush({message: 'ok'});
  });

  it('loads and validates stored user from localStorage on startup', () => {
    const validUser: AuthUser = {
      id: 10,
      email: 'admin@f1sets.local',
      displayName: 'Admin',
      role: 'ADMIN',
    };
    localStorage.setItem(userKey, JSON.stringify(validUser));

    const freshService = TestBed.inject(AuthService);
    expect(freshService.getCurrentUser()).toEqual(validUser);
    expect(freshService.isAdmin()).toBeTrue();
  });

  it('accepts USER role from storage and reports non-admin', () => {
    localStorage.setItem(
      userKey,
      JSON.stringify({id: 3, email: 'user@f1sets.local', displayName: 'User', role: 'USER'}),
    );

    const freshService = TestBed.inject(AuthService);
    expect(freshService.getCurrentUser()?.role).toBe('USER');
    expect(freshService.isAdmin()).toBeFalse();
  });

  it('ignores malformed stored user payload', () => {
    localStorage.setItem(userKey, '{"id":"oops","role":"ROOT"}');

    const freshService = TestBed.inject(AuthService);
    expect(freshService.getCurrentUser()).toBeNull();
  });

  it('returns null when stored user JSON is invalid', () => {
    localStorage.setItem(userKey, '{invalid-json');

    const freshService = TestBed.inject(AuthService);
    expect(freshService.getCurrentUser()).toBeNull();
  });

  it('updates current user when getMe succeeds', () => {
    const service = TestBed.inject(AuthService);
    const me: AuthUser = {
      id: 4,
      email: 'driver@f1sets.local',
      displayName: 'Driver',
      role: 'USER',
    };

    service.getMe().subscribe((user) => expect(user).toEqual(me));

    const req = httpMock.expectOne(`${apiBase}/auth/me`);
    expect(req.request.method).toBe('GET');
    req.flush(me);

    expect(service.getCurrentUser()).toEqual(me);
    expect(localStorage.getItem(userKey)).toBe(JSON.stringify(me));
  });

  it('clears session on logout', () => {
    const service = TestBed.inject(AuthService);
    localStorage.setItem(tokenKey, 'token');
    localStorage.setItem(
      userKey,
      JSON.stringify({id: 1, email: 'u@x.y', displayName: 'U', role: 'USER'}),
    );

    service.logout();

    expect(localStorage.getItem(tokenKey)).toBeNull();
    expect(localStorage.getItem(userKey)).toBeNull();
    expect(service.getCurrentUser()).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
  });
});
