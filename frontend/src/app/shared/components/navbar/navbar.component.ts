import {CommonModule} from '@angular/common';
import {HttpErrorResponse} from '@angular/common/http';
import {Component, ElementRef, HostListener, OnDestroy, OnInit, viewChild} from '@angular/core';
import {Router, RouterModule} from '@angular/router';
import {Observable, Subject, takeUntil} from 'rxjs';
import {AuthUser} from '../../../features/auth/data-access/auth.models';
import {AuthService} from '../../../features/auth/data-access/auth.service';
import {ProfileService} from '../../../features/profile/data-access/profile.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent implements OnInit, OnDestroy {
  readonly user$: Observable<AuthUser | null>;
  avatarUrl: string | null = null;
  dropdownOpen = false;
  adminDropdownOpen = false;
  readonly accountMenuRef = viewChild('accountMenu', {read: ElementRef});
  readonly adminMenuRef = viewChild('adminMenu', {read: ElementRef});
  private readonly destroy$ = new Subject<void>();
  private meBootstrapInFlight = false;

  constructor(
    private readonly authService: AuthService,
    private readonly profileService: ProfileService,
    private readonly router: Router,
  ) {
    this.user$ = this.authService.user$;
  }

  ngOnInit(): void {
    this.user$.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      if (!user) {
        this.avatarUrl = null;
        this.dropdownOpen = false;
        this.adminDropdownOpen = false;
        this.bootstrapUserFromStoredToken();
        return;
      }

      this.loadProfileAvatar();
    });

    this.bootstrapUserFromStoredToken();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.dropdownOpen = !this.dropdownOpen;
    if (this.dropdownOpen) {
      this.adminDropdownOpen = false;
    }
  }

  toggleAdminDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.adminDropdownOpen = !this.adminDropdownOpen;
    if (this.adminDropdownOpen) {
      this.dropdownOpen = false;
    }
  }

  closeDropdown(): void {
    this.dropdownOpen = false;
  }

  closeAdminDropdown(): void {
    this.adminDropdownOpen = false;
  }

  onMenuClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  logout(): void {
    this.closeDropdown();
    this.closeAdminDropdown();
    this.authService.logout();
    this.router.navigateByUrl('/home');
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.dropdownOpen && !this.adminDropdownOpen) {
      return;
    }

    const target = event.target as Node | null;
    const accountMenuElement = this.accountMenuRef()?.nativeElement;
    const adminMenuElement = this.adminMenuRef()?.nativeElement;

    const outsideAccountMenu =
      !accountMenuElement || !target || !accountMenuElement.contains(target);
    const outsideAdminMenu = !adminMenuElement || !target || !adminMenuElement.contains(target);

    if (outsideAccountMenu && outsideAdminMenu) {
      this.closeDropdown();
      this.closeAdminDropdown();
    }
  }

  private loadProfileAvatar(): void {
    this.profileService.getMyProfile().subscribe({
      next: (profile) => {
        this.avatarUrl = profile.avatarUrl;
      },
      error: () => {
        this.avatarUrl = null;
      },
    });
  }

  private bootstrapUserFromStoredToken(): void {
    if (
      !this.authService.isAuthenticated() ||
      this.authService.getCurrentUser() ||
      this.meBootstrapInFlight
    ) {
      return;
    }

    this.meBootstrapInFlight = true;
    this.authService.getMe().subscribe({
      next: () => {
        this.meBootstrapInFlight = false;
      },
      error: (error: unknown) => {
        this.meBootstrapInFlight = false;
        if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
          this.authService.logout();
        }
      },
    });
  }
}
