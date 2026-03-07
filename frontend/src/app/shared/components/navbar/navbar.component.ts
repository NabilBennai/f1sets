import {CommonModule} from '@angular/common';
import {HttpErrorResponse} from '@angular/common/http';
import {Component, ElementRef, HostListener, OnDestroy, OnInit, viewChild} from '@angular/core';
import {TranslateModule} from '@ngx-translate/core';
import {Router, RouterModule} from '@angular/router';
import {Observable, Subject, takeUntil} from 'rxjs';
import {AppLanguage, LanguageService} from '../../../core/i18n/language.service';
import {ThemeService} from '../../../core/theme/theme.service';
import {AuthUser} from '../../../features/auth/data-access/auth.models';
import {AuthService} from '../../../features/auth/data-access/auth.service';
import {ProfileService} from '../../../features/profile/data-access/profile.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent implements OnInit, OnDestroy {
  readonly user$: Observable<AuthUser | null>;
  readonly themes: readonly string[];
  readonly currentTheme$: Observable<string>;
  readonly languages: readonly AppLanguage[];
  readonly currentLanguage$: Observable<AppLanguage>;
  readonly themeDominantColors: Record<string, string> = {
    light: '#570df8',
    dark: '#793ef9',
    cupcake: '#65c3c8',
    bumblebee: '#e0a82e',
    emerald: '#66cc8a',
    corporate: '#4b6bfb',
    synthwave: '#e779c1',
    retro: '#ef9995',
    cyberpunk: '#ff7598',
    valentine: '#e96d7b',
    halloween: '#f28c18',
    garden: '#5c7f67',
    forest: '#1eb854',
    aqua: '#09ecf3',
    lofi: '#0d0d0d',
    pastel: '#d1c1d7',
    fantasy: '#6e0b75',
    wireframe: '#b8b8b8',
    black: '#343232',
    luxury: '#152747',
    dracula: '#ff79c6',
    cmyk: '#45aeee',
    autumn: '#8c0327',
    business: '#1c4e80',
    acid: '#ff00ff',
    lemonade: '#519903',
    night: '#38bdf8',
    coffee: '#db924b',
    winter: '#047aed',
    dim: '#9ca3af',
    nord: '#88c0d0',
    sunset: '#ff865b',
    caramellatte: '#c68b59',
    abyss: '#7dd3fc',
    silk: '#bfa6ff',
  };
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
    private readonly themeService: ThemeService,
    private readonly languageService: LanguageService,
  ) {
    this.user$ = this.authService.user$;
    this.themes = this.themeService.themes;
    this.currentTheme$ = this.themeService.currentTheme$;
    this.languages = this.languageService.supportedLanguages;
    this.currentLanguage$ = this.languageService.currentLanguage$;
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

  setTheme(theme: string): void {
    this.themeService.setTheme(theme);
  }

  setLanguage(language: AppLanguage): void {
    this.languageService.setLanguage(language);
  }

  getThemeDominantColor(theme: string): string {
    return this.themeDominantColors[theme] ?? '#9ca3af';
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
