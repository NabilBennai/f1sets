import {Injectable} from '@angular/core';
import {TranslateService} from '@ngx-translate/core';
import {BehaviorSubject} from 'rxjs';
import {AppToast, AppToastType} from './toast.models';

interface ToastOptions {
  title?: string;
  durationMs?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly toastsSubject = new BehaviorSubject<AppToast[]>([]);
  private nextId = 1;

  readonly toasts$ = this.toastsSubject.asObservable();

  constructor(private readonly translateService: TranslateService) {}

  success(message: string, options: ToastOptions = {}): number {
    return this.show('success', message, options);
  }

  info(message: string, options: ToastOptions = {}): number {
    return this.show('info', message, options);
  }

  error(message: string, options: ToastOptions = {}): number {
    return this.show('error', message, options);
  }

  dismiss(id: number): void {
    const current = this.toastsSubject.getValue();
    this.toastsSubject.next(current.filter((toast) => toast.id !== id));
  }

  private show(type: AppToastType, message: string, options: ToastOptions): number {
    const id = this.nextId++;
    const toast: AppToast = {
      id,
      type,
      title: options.title ?? this.defaultTitle(type),
      message,
      durationMs: options.durationMs ?? 3500,
    };
    this.toastsSubject.next([...this.toastsSubject.getValue(), toast]);
    setTimeout(() => this.dismiss(id), toast.durationMs);
    return id;
  }

  private defaultTitle(type: AppToastType): string {
    switch (type) {
      case 'success':
        return this.translateService.instant('toast.titles.success');
      case 'error':
        return this.translateService.instant('toast.titles.error');
      default:
        return this.translateService.instant('toast.titles.info');
    }
  }
}
