import {Component, forwardRef, output} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';

interface GameOption {
  code: string;
  label: string;
}

@Component({
  selector: 'app-game-autocomplete-input',
  templateUrl: './game-autocomplete-input.component.html',
  styleUrl: './game-autocomplete-input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => GameAutocompleteInputComponent),
      multi: true,
    },
  ],
  imports: [ReactiveFormsModule, FormsModule],
})
export class GameAutocompleteInputComponent implements ControlValueAccessor {
  readonly valueChange = output<string>();

  readonly options: GameOption[] = [
    {code: 'f12025', label: 'EA SPORTS F1 25'},
    {code: 'f12024', label: 'EA SPORTS F1 24'},
    {code: 'f12023', label: 'EA SPORTS F1 23'},
  ];

  value = '';
  disabled = false;
  dropdownOpen = false;

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    const normalized = (value ?? '').trim().toLowerCase();
    const option = this.options.find((item) => item.code === normalized);
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
    const exactMatch = this.options.find(
      (option) => option.code === normalized || option.label.toLowerCase() === normalized,
    );
    const emitted = exactMatch?.code ?? normalized;
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

  selectOption(code: string): void {
    const option = this.options.find((item) => item.code === code);
    this.value = option?.label ?? code;
    this.dropdownOpen = false;
    this.onChange(code);
    this.valueChange.emit(code);
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

  get filteredOptions(): GameOption[] {
    const query = this.value.trim().toLowerCase();
    if (!query) {
      return this.options;
    }
    return this.options.filter(
      (option) => option.code.includes(query) || option.label.toLowerCase().includes(query),
    );
  }
}
