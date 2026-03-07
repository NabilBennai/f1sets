import {Inject, Injectable, DOCUMENT} from '@angular/core';
import {BehaviorSubject} from 'rxjs';

@Injectable({providedIn: 'root'})
export class ThemeService {
  readonly themes = [
    'light',
    'dark',
    'cupcake',
    'bumblebee',
    'emerald',
    'corporate',
    'synthwave',
    'retro',
    'cyberpunk',
    'valentine',
    'halloween',
    'garden',
    'forest',
    'aqua',
    'lofi',
    'pastel',
    'fantasy',
    'wireframe',
    'black',
    'luxury',
    'dracula',
    'cmyk',
    'autumn',
    'business',
    'acid',
    'lemonade',
    'night',
    'coffee',
    'winter',
    'dim',
    'nord',
    'sunset',
    'caramellatte',
    'abyss',
    'silk',
  ] as const;

  readonly currentTheme$ = new BehaviorSubject<string>('night');

  private static readonly STORAGE_KEY = 'f1sets.theme';
  private initialized = false;
  private readonly themeSet = new Set<string>(this.themes);

  constructor(@Inject(DOCUMENT) private readonly documentRef: Document) {}

  init(): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    const storedTheme = this.getStoredTheme();
    this.applyTheme(storedTheme ?? 'night');
  }

  setTheme(theme: string): void {
    if (!this.themeSet.has(theme)) {
      return;
    }

    this.applyTheme(theme);
    this.storeTheme(theme);
  }

  private applyTheme(theme: string): void {
    this.documentRef.documentElement.setAttribute('data-theme', theme);
    this.currentTheme$.next(theme);
  }

  private getStoredTheme(): string | null {
    try {
      const value = this.documentRef.defaultView?.localStorage.getItem(ThemeService.STORAGE_KEY);
      if (value && this.themeSet.has(value)) {
        return value;
      }
    } catch {
      // Ignore storage access errors and fallback to default theme.
    }
    return null;
  }

  private storeTheme(theme: string): void {
    try {
      this.documentRef.defaultView?.localStorage.setItem(ThemeService.STORAGE_KEY, theme);
    } catch {
      // Ignore storage access errors.
    }
  }
}
