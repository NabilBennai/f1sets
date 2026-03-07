import {Component} from '@angular/core';
import {LanguageService} from './core/i18n/language.service';
import {ThemeService} from './core/theme/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
  styleUrl: './app.component.scss',
})
export class AppComponent {
  constructor(
    private readonly themeService: ThemeService,
    private readonly languageService: LanguageService,
  ) {
    this.themeService.init();
    this.languageService.init();
  }
}
