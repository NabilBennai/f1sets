import {HttpClient, provideHttpClient, withInterceptors} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {AuthService} from './auth.service';
import {authInterceptor} from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', ['getAccessToken']);

    TestBed.configureTestingModule({
      providers: [
        {provide: AuthService, useValue: authServiceSpy},
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('adds bearer token for API base URL requests', () => {
    authServiceSpy.getAccessToken.and.returnValue('jwt-123');

    http.get('http://localhost:8080/api/v1/auth/me').subscribe();

    const req = httpMock.expectOne('http://localhost:8080/api/v1/auth/me');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-123');
    req.flush({});
  });

  it('does not add auth header for non-api requests', () => {
    authServiceSpy.getAccessToken.and.returnValue('jwt-123');

    http.get('https://example.com/public/info').subscribe();

    const req = httpMock.expectOne('https://example.com/public/info');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('does not add auth header when token is missing', () => {
    authServiceSpy.getAccessToken.and.returnValue(null);

    http.get('http://localhost:8080/api/v1/auth/me').subscribe();

    const req = httpMock.expectOne('http://localhost:8080/api/v1/auth/me');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });
});
