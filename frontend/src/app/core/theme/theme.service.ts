import {Inject, Injectable, DOCUMENT} from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({providedIn: 'root'})
export class ThemeService {
  private initialized = false;

  constructor(@Inject(DOCUMENT) private readonly documentRef: Document) {}

  init(): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    const windowRef = this.documentRef.defaultView;
    const mediaQuery = windowRef?.matchMedia?.('(prefers-color-scheme: dark)');
    this.applyTheme(mediaQuery?.matches ? 'dark' : 'light');

    if (!mediaQuery) {
      return;
    }

    const onSystemThemeChange = (event: MediaQueryListEvent): void => {
      this.applyTheme(event.matches ? 'dark' : 'light');
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onSystemThemeChange);
      return;
    }

    mediaQuery.addListener(onSystemThemeChange);
  }

  private applyTheme(theme: ThemeMode): void {
    const root = this.documentRef.documentElement;
    root.setAttribute('data-theme', theme);
  }
}
