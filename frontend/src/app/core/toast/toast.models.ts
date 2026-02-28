export type AppToastType = 'success' | 'info' | 'error';

export interface AppToast {
  id: number;
  type: AppToastType;
  title: string;
  message: string;
  durationMs: number;
}
