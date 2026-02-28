import {CommonModule} from '@angular/common';
import {Component, ElementRef, EventEmitter, HostListener, Input, Output} from '@angular/core';
import {FormsModule} from '@angular/forms';

export interface MultiFilterOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-multi-autocomplete-filter',
  templateUrl: './multi-autocomplete-filter.component.html',
  styleUrl: './multi-autocomplete-filter.component.scss',
  imports: [CommonModule, FormsModule],
})
export class MultiAutocompleteFilterComponent {
  @Input() options: MultiFilterOption[] = [];
  @Input() selectedValues: string[] = [];
  @Input() placeholder = 'Filter';
  @Input() emptyLabel = 'No options';
  @Input() dense = true;

  @Output() readonly selectedValuesChange = new EventEmitter<string[]>();

  open = false;
  query = '';
  panelStyle: Record<string, string> = {};

  constructor(private readonly elementRef: ElementRef<HTMLElement>) {}

  get filteredOptions(): MultiFilterOption[] {
    const q = this.query.trim().toLowerCase();
    if (!q) {
      return this.options;
    }
    return this.options.filter(
      (opt) => opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q),
    );
  }

  get selectedCount(): number {
    return this.selectedValues.length;
  }

  toggleOpen(event: MouseEvent): void {
    event.stopPropagation();
    this.open = !this.open;
    if (this.open) {
      this.updatePanelPosition();
    }
  }

  clear(event: MouseEvent): void {
    event.stopPropagation();
    this.selectedValuesChange.emit([]);
  }

  isSelected(value: string): boolean {
    return this.selectedValues.includes(value);
  }

  toggleValue(value: string, event: Event): void {
    event.stopPropagation();
    if (this.isSelected(value)) {
      this.selectedValuesChange.emit(this.selectedValues.filter((item) => item !== value));
      return;
    }
    this.selectedValuesChange.emit([...this.selectedValues, value]);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const host = this.elementRef.nativeElement;
    if (!host.contains(event.target as Node)) {
      this.open = false;
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.open) {
      this.updatePanelPosition();
    }
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (this.open) {
      this.updatePanelPosition();
    }
  }

  private updatePanelPosition(): void {
    const host = this.elementRef.nativeElement;
    const trigger = host.querySelector('.multi-auto__trigger');
    if (!trigger) {
      return;
    }
    const rect = trigger.getBoundingClientRect();
    this.panelStyle = {
      position: 'fixed',
      top: `${rect.bottom + 4}px`,
      left: `${rect.left}px`,
      width: `${Math.max(rect.width, 220)}px`,
      zIndex: '1200',
    };
  }
}
