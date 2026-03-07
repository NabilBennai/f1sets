import {CommonModule} from '@angular/common';
import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {TranslateModule} from '@ngx-translate/core';

@Component({
  selector: 'app-erp-pagination',
  templateUrl: './erp-pagination.component.html',
  styleUrl: './erp-pagination.component.scss',
  imports: [CommonModule, FormsModule, TranslateModule],
})
export class ErpPaginationComponent implements OnChanges {
  @Input() mode: 'backend' | 'frontend' = 'backend';
  @Input() page = 0;
  @Input() totalPages = 0;
  @Input() totalItems = 0;
  @Input() pageSize = 25;
  @Input() pageSizeOptions: number[] = [10, 25, 50, 100];
  @Input() loading = false;
  @Input() showPageSize = true;
  @Input() showSummary = true;
  @Input() showPageInput = true;
  @Input() entityLabel = 'rows';

  @Output() readonly pageChange = new EventEmitter<number>();
  @Output() readonly pageSizeChange = new EventEmitter<number>();

  pageInput = '1';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['page']) {
      this.pageInput = String((this.page ?? 0) + 1);
    }
  }

  get effectiveTotalPages(): number {
    if (this.mode === 'frontend') {
      const pages = Math.ceil(Math.max(this.totalItems, 0) / Math.max(this.pageSize, 1));
      return Math.max(pages, 1);
    }
    return Math.max(this.totalPages || 0, 1);
  }

  get maxPageIndex(): number {
    return Math.max(this.effectiveTotalPages - 1, 0);
  }

  get canGoPrev(): boolean {
    return !this.loading && this.page > 0;
  }

  get canGoNext(): boolean {
    return !this.loading && this.page < this.maxPageIndex;
  }

  goFirst(): void {
    this.emitPage(0);
  }

  goPrev(): void {
    this.emitPage(Math.max(this.page - 1, 0));
  }

  goNext(): void {
    this.emitPage(Math.min(this.page + 1, this.maxPageIndex));
  }

  goLast(): void {
    this.emitPage(this.maxPageIndex);
  }

  applyPageInput(): void {
    const parsed = Number.parseInt(this.pageInput, 10);
    if (Number.isNaN(parsed)) {
      this.pageInput = String(this.page + 1);
      return;
    }
    const normalized = Math.min(Math.max(parsed, 1), this.effectiveTotalPages);
    this.emitPage(normalized - 1);
  }

  onPageSizeSelect(rawValue: string): void {
    const parsed = Number.parseInt(rawValue, 10);
    if (Number.isNaN(parsed) || parsed <= 0 || parsed === this.pageSize) {
      return;
    }
    this.pageSizeChange.emit(parsed);
    if (this.page !== 0) {
      this.pageChange.emit(0);
    }
  }

  private emitPage(nextPage: number): void {
    if (nextPage === this.page || this.loading) {
      return;
    }
    this.pageChange.emit(nextPage);
  }
}
