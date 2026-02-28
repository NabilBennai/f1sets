import {HttpErrorResponse} from '@angular/common/http';
import {ChangeDetectionStrategy, ChangeDetectorRef, Component} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import {AdminSetupSchemaService} from '../../data-access/admin-setup-schema.service';
import {SetupFieldDefinition, SetupFieldType} from '../../../setups/models/setup.models';
import {GameAutocompleteInputComponent} from '../../../../shared/components/game-autocomplete-input/game-autocomplete-input.component';

type FieldGroup = FormGroup<{
  fieldKey: FormControl<string>;
  fieldLabel: FormControl<string>;
  fieldType: FormControl<SetupFieldType>;
  required: FormControl<boolean>;
  sortOrder: FormControl<number>;
  selectOptionsRaw: FormControl<string>;
}>;

@Component({
  selector: 'app-admin-setup-page',
  templateUrl: './admin-setup-page.component.html',
  styleUrl: './admin-setup-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GameAutocompleteInputComponent, ReactiveFormsModule],
})
export class AdminSetupPageComponent {
  readonly gameControl = new FormControl('f12025', {nonNullable: true});
  readonly fieldTypes: SetupFieldType[] = ['TEXT', 'NUMBER', 'BOOLEAN', 'SELECT'];
  readonly form: FormGroup<{fields: FormArray<FieldGroup>}>;

  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly adminSetupSchemaService: AdminSetupSchemaService,
    private readonly cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      fields: this.fb.array<FieldGroup>([]),
    });
    this.loadSchema();
  }

  get fieldsArray(): FormArray<FieldGroup> {
    return this.form.controls.fields;
  }

  loadSchema(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.adminSetupSchemaService.getSchema(this.gameControl.value).subscribe({
      next: (response) => {
        this.loading = false;
        this.fieldsArray.clear();
        response.fields.forEach((field) => this.fieldsArray.push(this.createFieldGroup(field)));
        if (response.fields.length === 0) {
          this.addField();
        }
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = this.resolveErrorMessage(error);
        this.cdr.markForCheck();
      },
    });
  }

  addField(): void {
    this.fieldsArray.push(this.createFieldGroup());
  }

  removeField(index: number): void {
    this.fieldsArray.removeAt(index);
  }

  save(): void {
    if (this.saving) {
      return;
    }

    const fields = this.fieldsArray.controls.map((group, index) => {
      const value = group.getRawValue();
      return {
        fieldKey: value.fieldKey.trim().toLowerCase(),
        fieldLabel: value.fieldLabel.trim(),
        fieldType: value.fieldType,
        required: value.required,
        sortOrder: value.sortOrder ?? index,
        selectOptions:
          value.fieldType === 'SELECT'
            ? value.selectOptionsRaw
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean)
            : [],
      } satisfies SetupFieldDefinition;
    });

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.adminSetupSchemaService.saveSchema(this.gameControl.value, fields).subscribe({
      next: (response) => {
        this.saving = false;
        this.fieldsArray.clear();
        response.fields.forEach((field) => this.fieldsArray.push(this.createFieldGroup(field)));
        this.successMessage = 'Setup field schema saved.';
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = this.resolveErrorMessage(error);
        this.cdr.markForCheck();
      },
    });
  }

  private createFieldGroup(field?: SetupFieldDefinition): FieldGroup {
    return this.fb.group({
      fieldKey: this.fb.control(field?.fieldKey ?? '', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      fieldLabel: this.fb.control(field?.fieldLabel ?? '', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      fieldType: this.fb.control(field?.fieldType ?? 'TEXT', {nonNullable: true}),
      required: this.fb.control(field?.required ?? false, {nonNullable: true}),
      sortOrder: this.fb.control(field?.sortOrder ?? this.fieldsArray.length, {nonNullable: true}),
      selectOptionsRaw: this.fb.control((field?.selectOptions ?? []).join(', '), {
        nonNullable: true,
      }),
    });
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      return error.error?.message ?? `Request failed (status ${error.status}).`;
    }
    return 'Request failed.';
  }
}
