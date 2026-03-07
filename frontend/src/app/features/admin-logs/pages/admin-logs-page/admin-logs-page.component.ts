import {CommonModule, DatePipe} from '@angular/common';
import {HttpErrorResponse} from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  OnDestroy,
} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
import {debounceTime, Subject, takeUntil} from 'rxjs';
import {AdminLogsService} from '../../data-access/admin-logs.service';
import {AdminLogItem, AdminLogListResponse} from '../../models/admin-logs.models';
import {ToastService} from '../../../../core/toast/toast.service';
import {ErpPaginationComponent} from '../../../../shared/components/erp-pagination/erp-pagination.component';
import {
  MultiAutocompleteFilterComponent,
  MultiFilterOption,
} from '../../../../shared/components/multi-autocomplete-filter/multi-autocomplete-filter.component';

type LogFilterForm = FormGroup<{
  pathContains: FormControl<string>;
  userEmailContains: FormControl<string>;
  createdFrom: FormControl<string>;
  createdTo: FormControl<string>;
}>;

@Component({
  selector: 'app-admin-logs-page',
  templateUrl: './admin-logs-page.component.html',
  styleUrl: './admin-logs-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePipe,
    TranslateModule,
    ErpPaginationComponent,
    MultiAutocompleteFilterComponent,
  ],
})
export class AdminLogsPageComponent implements OnDestroy {
  readonly levelOptions: MultiFilterOption[] = ['INFO', 'WARN', 'ERROR'].map((value) => ({
    value,
    label: value,
  }));
  readonly methodOptions: MultiFilterOption[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(
    (value) => ({
      value,
      label: value,
    }),
  );
  readonly statusOptions = [
    {value: '2xx', label: '2xx'},
    {value: '3xx', label: '3xx'},
    {value: '4xx', label: '4xx'},
    {value: '5xx', label: '5xx'},
    {value: '200', label: '200'},
    {value: '201', label: '201'},
    {value: '204', label: '204'},
    {value: '400', label: '400'},
    {value: '401', label: '401'},
    {value: '403', label: '403'},
    {value: '404', label: '404'},
    {value: '500', label: '500'},
  ] satisfies MultiFilterOption[];
  readonly sortableColumns = [
    'createdAt',
    'level',
    'httpMethod',
    'path',
    'statusCode',
    'durationMs',
  ] as const;

  readonly filters: LogFilterForm = new FormGroup({
    pathContains: new FormControl('', {nonNullable: true}),
    userEmailContains: new FormControl('', {nonNullable: true}),
    createdFrom: new FormControl('', {nonNullable: true}),
    createdTo: new FormControl('', {nonNullable: true}),
  });

  logs: AdminLogItem[] = [];
  selectedLevels: string[] = [];
  selectedMethods: string[] = [];
  selectedStatuses: string[] = [];
  pageSize = 50;
  readonly pageSizeOptions = [25, 50, 100, 200];
  page = 0;
  totalPages = 0;
  totalElements = 0;
  sortBy = 'createdAt';
  sortDirection: 'ASC' | 'DESC' = 'DESC';
  loading = false;
  errorMessage = '';
  jsonModalOpen = false;
  jsonModalTitle = '';
  jsonModalContent = '';
  jsonModalLines: Array<{number: number; html: string}> = [];
  contextMenuOpen = false;
  contextMenuX = 0;
  contextMenuY = 0;
  contextColumn: string | null = null;
  contextValue = '';

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly adminLogsService: AdminLogsService,
    private readonly toastService: ToastService,
    private readonly translateService: TranslateService,
    private readonly cdr: ChangeDetectorRef,
  ) {
    this.filters.valueChanges.pipe(debounceTime(300), takeUntil(this.destroy$)).subscribe(() => {
      this.page = 0;
      this.loadLogs();
    });

    this.loadLogs();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  clearFilters(): void {
    this.filters.reset({
      pathContains: '',
      userEmailContains: '',
      createdFrom: '',
      createdTo: '',
    });
    this.selectedLevels = [];
    this.selectedMethods = [];
    this.selectedStatuses = [];
    this.pageSize = 50;
    this.page = 0;
    this.sortBy = 'createdAt';
    this.sortDirection = 'DESC';
    this.loadLogs();
  }

  refresh(): void {
    this.loadLogs();
  }

  onLevelsChange(values: string[]): void {
    this.selectedLevels = [...values];
    this.page = 0;
    this.loadLogs();
  }

  onMethodsChange(values: string[]): void {
    this.selectedMethods = [...values];
    this.page = 0;
    this.loadLogs();
  }

  onStatusesChange(values: string[]): void {
    this.selectedStatuses = [...values];
    this.page = 0;
    this.loadLogs();
  }

  setSort(column: (typeof this.sortableColumns)[number]): void {
    if (this.sortBy === column) {
      this.sortDirection = this.sortDirection === 'DESC' ? 'ASC' : 'DESC';
    } else {
      this.sortBy = column;
      this.sortDirection = 'DESC';
    }
    this.page = 0;
    this.loadLogs();
  }

  trackByLogId(_index: number, item: AdminLogItem): number {
    return item.id;
  }

  isSortedBy(column: string): boolean {
    return this.sortBy === column;
  }

  sortMark(column: string): string {
    if (this.sortBy !== column) {
      return '';
    }
    return this.sortDirection === 'DESC' ? 'DESC' : 'ASC';
  }

  openRequestJson(log: AdminLogItem): void {
    this.openJsonModal(
      this.translateService.instant('adminLogs.json.requestTitle'),
      log.requestPayloadJson,
    );
  }

  openResponseJson(log: AdminLogItem): void {
    this.openJsonModal(
      this.translateService.instant('adminLogs.json.responseTitle'),
      log.responseBodyJson,
    );
  }

  closeJsonModal(): void {
    this.jsonModalOpen = false;
    this.jsonModalTitle = '';
    this.jsonModalContent = '';
    this.jsonModalLines = [];
  }

  copyJsonModalContent(): void {
    if (!this.jsonModalContent) {
      return;
    }
    navigator.clipboard
      .writeText(this.jsonModalContent)
      .then(() =>
        this.toastService.success(this.translateService.instant('adminLogs.messages.jsonCopied')),
      )
      .catch(() =>
        this.toastService.error(this.translateService.instant('adminLogs.messages.jsonCopyFailed')),
      );
  }

  openContextMenu(event: MouseEvent, column: string, value: unknown): void {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenuX = event.clientX;
    this.contextMenuY = event.clientY;
    this.contextColumn = column;
    this.contextValue = value == null ? '' : String(value);
    this.contextMenuOpen = true;
    this.cdr.markForCheck();
  }

  closeContextMenu(): void {
    this.contextMenuOpen = false;
    this.contextColumn = null;
    this.contextValue = '';
  }

  copyContextValue(): void {
    if (!this.contextValue) {
      this.closeContextMenu();
      return;
    }
    navigator.clipboard.writeText(this.contextValue).finally(() => this.closeContextMenu());
  }

  filterByContextValue(): void {
    if (!this.contextColumn) {
      this.closeContextMenu();
      return;
    }
    const value = this.contextValue;
    switch (this.contextColumn) {
      case 'level':
        this.selectedLevels = [value.toUpperCase()];
        this.page = 0;
        this.loadLogs();
        break;
      case 'httpMethod':
        this.selectedMethods = [value.toUpperCase()];
        this.page = 0;
        this.loadLogs();
        break;
      case 'path':
        this.filters.controls.pathContains.setValue(value);
        break;
      case 'statusCode':
        this.selectedStatuses = [value];
        this.page = 0;
        this.loadLogs();
        break;
      case 'userEmail':
        this.filters.controls.userEmailContains.setValue(value);
        break;
      default:
        break;
    }
    this.closeContextMenu();
  }

  clearContextColumnFilter(): void {
    if (!this.contextColumn) {
      this.closeContextMenu();
      return;
    }
    switch (this.contextColumn) {
      case 'level':
        this.selectedLevels = [];
        this.page = 0;
        this.loadLogs();
        break;
      case 'httpMethod':
        this.selectedMethods = [];
        this.page = 0;
        this.loadLogs();
        break;
      case 'path':
        this.filters.controls.pathContains.setValue('');
        break;
      case 'statusCode':
        this.selectedStatuses = [];
        this.page = 0;
        this.loadLogs();
        break;
      case 'userEmail':
        this.filters.controls.userEmailContains.setValue('');
        break;
      default:
        break;
    }
    this.closeContextMenu();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.contextMenuOpen) {
      this.closeContextMenu();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.contextMenuOpen) {
      this.closeContextMenu();
    }
  }

  private loadLogs(): void {
    this.loading = true;
    this.errorMessage = '';
    const value = this.filters.getRawValue();

    this.adminLogsService
      .getLogs({
        level: this.selectedLevels[0] || undefined,
        httpMethod: this.selectedMethods[0] || undefined,
        pathContains: value.pathContains.trim() || undefined,
        userEmailContains: value.userEmailContains.trim() || undefined,
        statusFrom: this.statusRangeFromSelect(this.selectedStatuses[0] ?? '').from,
        statusTo: this.statusRangeFromSelect(this.selectedStatuses[0] ?? '').to,
        createdFrom: this.parseDateOrUndefined(value.createdFrom),
        createdTo: this.parseDateOrUndefined(value.createdTo),
        page: this.page,
        size: this.pageSize,
        sortBy: this.sortBy,
        sortDirection: this.sortDirection,
      })
      .subscribe({
        next: (response) => this.onLoadSuccess(response),
        error: (error) => this.onLoadError(error),
      });
  }

  private onLoadSuccess(response: AdminLogListResponse): void {
    this.logs = this.applyMultiFilters(response.items ?? []);
    this.page = response.page ?? 0;
    this.totalPages = response.totalPages ?? 0;
    this.totalElements = response.totalElements ?? 0;
    this.loading = false;
    this.cdr.markForCheck();
  }

  private onLoadError(error: unknown): void {
    this.logs = [];
    this.totalPages = 0;
    this.totalElements = 0;
    this.loading = false;
    this.errorMessage = this.resolveErrorMessage(error);
    this.cdr.markForCheck();
  }

  private parseIntOrUndefined(value: string): number | undefined {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  private statusRangeFromSelect(value: string): {from?: number; to?: number} {
    const trimmed = value.trim();
    if (!trimmed) {
      return {};
    }
    if (trimmed === '2xx') {
      return {from: 200, to: 299};
    }
    if (trimmed === '3xx') {
      return {from: 300, to: 399};
    }
    if (trimmed === '4xx') {
      return {from: 400, to: 499};
    }
    if (trimmed === '5xx') {
      return {from: 500, to: 599};
    }
    const exact = Number.parseInt(trimmed, 10);
    return Number.isNaN(exact) ? {} : {from: exact, to: exact};
  }

  private applyMultiFilters(items: AdminLogItem[]): AdminLogItem[] {
    return items.filter((item) => {
      const levelMatch =
        this.selectedLevels.length === 0 || this.selectedLevels.includes(item.level);
      const methodMatch =
        this.selectedMethods.length === 0 ||
        this.selectedMethods.includes((item.httpMethod ?? '').toUpperCase());
      const statusValue = String(item.statusCode ?? '');
      const statusMatch =
        this.selectedStatuses.length === 0 ||
        this.selectedStatuses.some((selected) => {
          if (selected === '2xx') return item.statusCode >= 200 && item.statusCode <= 299;
          if (selected === '3xx') return item.statusCode >= 300 && item.statusCode <= 399;
          if (selected === '4xx') return item.statusCode >= 400 && item.statusCode <= 499;
          if (selected === '5xx') return item.statusCode >= 500 && item.statusCode <= 599;
          return selected === statusValue;
        });
      return levelMatch && methodMatch && statusMatch;
    });
  }

  private parseDateOrUndefined(value: string): string | undefined {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      return (
        error.error?.message ??
        this.translateService.instant('common.requestFailedWithStatus', {status: error.status})
      );
    }
    return this.translateService.instant('common.requestFailed');
  }

  private openJsonModal(title: string, rawJson: string | null): void {
    if (!rawJson || !rawJson.trim()) {
      this.jsonModalTitle = title;
      this.jsonModalContent = this.translateService.instant('adminLogs.json.noPayload');
      this.jsonModalLines = this.toHighlightedLines(this.jsonModalContent);
      this.jsonModalOpen = true;
      return;
    }

    this.jsonModalTitle = title;
    this.jsonModalContent = this.prettyPrintJson(rawJson);
    this.jsonModalLines = this.toHighlightedLines(this.jsonModalContent);
    this.jsonModalOpen = true;
  }

  private prettyPrintJson(value: string): string {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }

  private toHighlightedLines(value: string): Array<{number: number; html: string}> {
    return value.split('\n').map((line, index) => ({
      number: index + 1,
      html: this.highlightJsonLine(line),
    }));
  }

  private highlightJsonLine(line: string): string {
    const tokenRegex =
      /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?/g;
    let output = '';
    let cursor = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(line)) !== null) {
      const full = match[0];
      const index = match.index;
      output += this.escapeHtml(line.slice(cursor, index));

      if (match[1]) {
        const cssClass = match[2] ? 'json-token--key' : 'json-token--string';
        output += `<span class="${cssClass}">${this.escapeHtml(full)}</span>`;
      } else if (match[3]) {
        output += `<span class="json-token--boolean">${this.escapeHtml(full)}</span>`;
      } else {
        output += `<span class="json-token--number">${this.escapeHtml(full)}</span>`;
      }
      cursor = index + full.length;
    }

    output += this.escapeHtml(line.slice(cursor));
    return output.length === 0 ? '&nbsp;' : output;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  onPaginationPageChange(page: number): void {
    if (this.loading || page === this.page || page < 0) {
      return;
    }
    if (this.totalPages > 0 && page + 1 > this.totalPages) {
      return;
    }
    this.page = page;
    this.loadLogs();
  }

  onPaginationPageSizeChange(size: number): void {
    if (this.loading || size === this.pageSize) {
      return;
    }
    this.pageSize = size;
    this.page = 0;
    this.loadLogs();
  }
}
