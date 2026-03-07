import {Injectable} from '@angular/core';
import {TranslateService} from '@ngx-translate/core';
import {BehaviorSubject} from 'rxjs';

export type AppLanguage = 'en' | 'fr';

@Injectable({providedIn: 'root'})
export class LanguageService {
  readonly supportedLanguages: readonly AppLanguage[] = ['en', 'fr'];
  readonly currentLanguage$ = new BehaviorSubject<AppLanguage>('en');

  private static readonly STORAGE_KEY = 'f1sets.language';
  private initialized = false;

  constructor(private readonly translateService: TranslateService) {}

  init(): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    this.translateService.addLangs([...this.supportedLanguages]);
    this.translateService.setDefaultLang('en');

    const preferred = this.getStoredLanguage() ?? this.getBrowserLanguage() ?? 'en';
    this.setLanguage(preferred);
  }

  setLanguage(language: AppLanguage): void {
    if (!this.supportedLanguages.includes(language)) {
      return;
    }

    this.translateService.use(language);
    this.currentLanguage$.next(language);
    this.storeLanguage(language);
  }

  private getBrowserLanguage(): AppLanguage | null {
    const browserLang = this.translateService.getBrowserLang()?.toLowerCase();
    if (browserLang === 'fr') {
      return 'fr';
    }
    if (browserLang === 'en') {
      return 'en';
    }
    return null;
  }

  private getStoredLanguage(): AppLanguage | null {
    try {
      const value = localStorage.getItem(LanguageService.STORAGE_KEY);
      if (value === 'en' || value === 'fr') {
        return value;
      }
    } catch {
      // Ignore storage errors.
    }
    return null;
  }

  private storeLanguage(language: AppLanguage): void {
    try {
      localStorage.setItem(LanguageService.STORAGE_KEY, language);
    } catch {
      // Ignore storage errors.
    }
  }
}
