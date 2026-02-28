import {Component} from '@angular/core';
import {ThemeService} from './core/theme/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
  styleUrl: './app.component.scss',
})
export class AppComponent {
  constructor(private readonly themeService: ThemeService) {
    this.themeService.init();
  }
}
