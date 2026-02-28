import {TestBed} from '@angular/core/testing';
import {Router, UrlTree} from '@angular/router';
import {firstValueFrom, isObservable, of, throwError} from 'rxjs';
import {AuthService} from '../data-access/auth.service';
import {adminGuard} from './admin.guard';
import {authGuard} from './auth.guard';

describe('auth guards', () => {
  let routerSpy: jasmine.SpyObj<Router>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let loginTree: UrlTree;
  let homeTree: UrlTree;

  beforeEach(() => {
    loginTree = {} as UrlTree;
    homeTree = {} as UrlTree;

    routerSpy = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
    routerSpy.createUrlTree.and.callFake((commands: unknown[]) => {
      const key = Array.isArray(commands) ? commands.join('/') : '';
      return key === '/auth/login' ? loginTree : homeTree;
    });

    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', [
      'isAuthenticated',
      'getCurrentUser',
      'getMe',
    ]);

    TestBed.configureTestingModule({
      providers: [
        {provide: Router, useValue: routerSpy},
        {provide: AuthService, useValue: authServiceSpy},
      ],
    });
  });

  it('authGuard redirects to login when unauthenticated', () => {
    authServiceSpy.isAuthenticated.and.returnValue(false);

    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(result).toBe(loginTree);
  });

  it('authGuard allows authenticated users', () => {
    authServiceSpy.isAuthenticated.and.returnValue(true);

    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(result).toBeTrue();
  });

  it('adminGuard allows admin current user', () => {
    authServiceSpy.isAuthenticated.and.returnValue(true);
    authServiceSpy.getCurrentUser.and.returnValue({
      id: 1,
      email: 'admin@f1sets.local',
      displayName: 'Admin',
      role: 'ADMIN',
    });

    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));

    expect(result).toBeTrue();
  });

  it('adminGuard redirects unauthenticated users to login', () => {
    authServiceSpy.isAuthenticated.and.returnValue(false);

    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));

    expect(result).toBe(loginTree);
  });

  it('adminGuard redirects user role to home', () => {
    authServiceSpy.isAuthenticated.and.returnValue(true);
    authServiceSpy.getCurrentUser.and.returnValue({
      id: 2,
      email: 'user@f1sets.local',
      displayName: 'User',
      role: 'USER',
    });

    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));

    expect(result).toBe(homeTree);
  });

  it('adminGuard falls back to getMe and redirects to login on error', async () => {
    authServiceSpy.isAuthenticated.and.returnValue(true);
    authServiceSpy.getCurrentUser.and.returnValue(null);
    authServiceSpy.getMe.and.returnValue(throwError(() => new Error('401')));

    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));
    if (!isObservable(result)) {
      fail('Expected adminGuard to return an observable in fallback branch');
      return;
    }
    expect(await firstValueFrom(result)).toBe(loginTree);
  });

  it('adminGuard falls back to getMe and allows admin from API', async () => {
    authServiceSpy.isAuthenticated.and.returnValue(true);
    authServiceSpy.getCurrentUser.and.returnValue(null);
    authServiceSpy.getMe.and.returnValue(
      of({id: 99, email: 'admin@f1sets.local', displayName: 'Admin', role: 'ADMIN'}),
    );

    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));
    if (!isObservable(result)) {
      fail('Expected adminGuard to return an observable in getMe fallback branch');
      return;
    }
    expect(await firstValueFrom(result)).toBeTrue();
  });

  it('adminGuard falls back to getMe and redirects USER from API to home', async () => {
    authServiceSpy.isAuthenticated.and.returnValue(true);
    authServiceSpy.getCurrentUser.and.returnValue(null);
    authServiceSpy.getMe.and.returnValue(
      of({id: 15, email: 'user@f1sets.local', displayName: 'User', role: 'USER'}),
    );

    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));
    if (!isObservable(result)) {
      fail('Expected adminGuard to return an observable in getMe fallback branch');
      return;
    }
    expect(await firstValueFrom(result)).toBe(homeTree);
  });
});
