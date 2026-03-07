import {CommonModule} from '@angular/common';
import {Component} from '@angular/core';
import {TranslateModule} from '@ngx-translate/core';
import {ToastService} from './toast.service';
import {AppToast} from './toast.models';

@Component({
  selector: 'app-toast-viewport',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './toast-viewport.component.html',
  styleUrl: './toast-viewport.component.scss',
})
export class ToastViewportComponent {
  readonly toasts$;

  constructor(private readonly toastService: ToastService) {
    this.toasts$ = this.toastService.toasts$;
  }

  dismiss(id: number): void {
    this.toastService.dismiss(id);
  }

  trackByToastId(_index: number, toast: AppToast): number {
    return toast.id;
  }
}
