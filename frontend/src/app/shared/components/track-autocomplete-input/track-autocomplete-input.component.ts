import {Component, forwardRef, input, output} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import {TranslateModule} from '@ngx-translate/core';

export interface TrackAutocompleteOption {
  slug: string;
  label: string;
}

@Component({
  selector: 'app-track-autocomplete-input',
  templateUrl: './track-autocomplete-input.component.html',
  styleUrl: './track-autocomplete-input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TrackAutocompleteInputComponent),
      multi: true,
    },
  ],
  imports: [ReactiveFormsModule, FormsModule, TranslateModule],
})
export class TrackAutocompleteInputComponent implements ControlValueAccessor {
  readonly options = input<TrackAutocompleteOption[]>([]);
  readonly valueChange = output<string>();

  value = '';
  disabled = false;
  dropdownOpen = false;

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    const normalized = (value ?? '').trim().toLowerCase();
    const option = this.options().find((item) => item.slug === normalized);
    this.value = option?.label ?? normalized;
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  handleInput(rawValue: string): void {
    this.value = rawValue;
    this.dropdownOpen = true;
    const normalized = rawValue.trim().toLowerCase();
    const exactMatch = this.options().find(
      (option) => option.slug === normalized || option.label.toLowerCase() === normalized,
    );
    const emitted = exactMatch?.slug ?? normalized;
    this.onChange(emitted);
    this.valueChange.emit(emitted);
  }

  handleFocus(): void {
    if (!this.disabled) {
      this.dropdownOpen = true;
    }
  }

  handleBlur(): void {
    setTimeout(() => {
      this.dropdownOpen = false;
      this.onTouched();
    }, 120);
  }

  selectOption(slug: string): void {
    const option = this.options().find((item) => item.slug === slug);
    this.value = option?.label ?? slug;
    this.dropdownOpen = false;
    this.onChange(slug);
    this.valueChange.emit(slug);
    this.onTouched();
  }

  clearValue(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.value = '';
    this.dropdownOpen = false;
    this.onChange('');
    this.valueChange.emit('');
    this.onTouched();
  }

  get filteredOptions(): TrackAutocompleteOption[] {
    const query = this.value.trim().toLowerCase();
    if (!query) {
      return this.options().slice(0, 50);
    }
    return this.options()
      .filter((option) => option.slug.includes(query) || option.label.toLowerCase().includes(query))
      .slice(0, 50);
  }
}
