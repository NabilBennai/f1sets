import {HttpErrorResponse} from '@angular/common/http';
import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {FormControl, FormGroup, Validators, ReactiveFormsModule, FormsModule} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {debounceTime, distinctUntilChanged, map} from 'rxjs/operators';
import {forkJoin} from 'rxjs';
import {AuthService} from '../../../auth/data-access/auth.service';
import {TrackDiscoveryService} from '../../../discovery/data-access/track-discovery.service';
import {SetupService} from '../../data-access/setup.service';
import {SetupFieldDefinition, SetupItem} from '../../models/setup.models';
import {TrackAutocompleteOption} from '../../../../shared/components/track-autocomplete-input/track-autocomplete-input.component';
import {UpperCasePipe, DatePipe} from '@angular/common';
import {ErpPaginationComponent} from '../../../../shared/components/erp-pagination/erp-pagination.component';
import {
  MultiAutocompleteFilterComponent,
  MultiFilterOption,
} from '../../../../shared/components/multi-autocomplete-filter/multi-autocomplete-filter.component';

type PublishFormGroup = FormGroup<{
  title: FormControl<string>;
  notes: FormControl<string>;
  sessionType: FormControl<string>;
  weatherCondition: FormControl<string>;
  assistsPreset: FormControl<string>;
  inputDevice: FormControl<string>;
  fuelLoadKg: FormControl<number | null>;
  tyreCompound: FormControl<string>;
}>;

type SearchFormGroup = FormGroup<{
  gameCode: FormControl<string>;
  trackSlug: FormControl<string>;
  query: FormControl<string>;
}>;

@Component({
  selector: 'app-setup-publisher-page',
  templateUrl: './setup-publisher-page.component.html',
  styleUrl: './setup-publisher-page.component.scss',
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    UpperCasePipe,
    DatePipe,
    ErpPaginationComponent,
    MultiAutocompleteFilterComponent,
  ],
})
export class SetupPublisherPageComponent implements OnInit {
  private static readonly GROUP_SEPARATOR = '||';
  readonly publishForm: PublishFormGroup = new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3)],
    }),
    notes: new FormControl('', {nonNullable: true}),
    sessionType: new FormControl('race', {nonNullable: true}),
    weatherCondition: new FormControl('dry', {nonNullable: true}),
    assistsPreset: new FormControl('full', {nonNullable: true}),
    inputDevice: new FormControl('wheel', {nonNullable: true}),
    fuelLoadKg: new FormControl<number | null>(null),
    tyreCompound: new FormControl('medium', {nonNullable: true}),
  });

  readonly searchForm: SearchFormGroup = new FormGroup({
    gameCode: new FormControl('', {nonNullable: true}),
    trackSlug: new FormControl('', {nonNullable: true}),
    query: new FormControl('', {nonNullable: true}),
  });

  gameCode = '';
  trackSlug = '';
  query = '';
  trackOptions: TrackAutocompleteOption[] = [];
  setupFields: SetupFieldDefinition[] = [];
  readonly setupValuesForm = new FormGroup({});
  readonly editSetupValuesForm = new FormGroup({});
  setups: SetupItem[] = [];
  treeRows: SetupTreeRow[] = [];
  recommendedSetups: SetupItem[] = [];
  publishModalOpen = false;
  loading = false;
  publishing = false;
  editingSetupId: number | null = null;
  editTitle = '';
  editNotes = '';
  selectedSetup: SetupItem | null = null;
  compareSetupId: number | null = null;
  deletingSetupId: number | null = null;
  private readonly expandedGroupKeys = new Set<string>();
  page = 0;
  pageSize = 25;
  readonly pageSizeOptions = [25, 50, 100];
  totalPages = 0;
  totalSetups = 0;
  filteredSetups = 0;
  errorMessage = '';
  successMessage = '';
  reportReason = '';
  selectedGameFilters: string[] = [];
  selectedTrackFilters: string[] = [];
  selectedSessionFilters: string[] = [];
  selectedWeatherFilters: string[] = [];
  selectedInputFilters: string[] = [];
  private lastAppliedSearchKey = '';
  private requestedModalSetupId: number | null = null;

  readonly sessionOptions = ['race', 'qualifying', 'time-trial'];
  readonly weatherOptions = ['dry', 'mixed', 'wet'];
  readonly inputDeviceOptions = ['wheel', 'controller', 'keyboard'];
  readonly gameFilterOptions: MultiFilterOption[] = [
    {value: 'f12025', label: 'EA SPORTS F1 25'},
    {value: 'f12024', label: 'EA SPORTS F1 24'},
    {value: 'f12023', label: 'EA SPORTS F1 23'},
  ];
  trackFilterOptions: MultiFilterOption[] = [];
  readonly sessionFilterOptions: MultiFilterOption[] = this.sessionOptions.map((value) => ({
    value,
    label: value,
  }));
  readonly weatherFilterOptions: MultiFilterOption[] = this.weatherOptions.map((value) => ({
    value,
    label: value,
  }));
  readonly inputDeviceFilterOptions: MultiFilterOption[] = this.inputDeviceOptions.map((value) => ({
    value,
    label: value,
  }));

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly setupService: SetupService,
    private readonly authService: AuthService,
    private readonly trackDiscoveryService: TrackDiscoveryService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.gameCode = (params.get('gameCode') ?? '').toLowerCase();
      this.trackSlug = (params.get('trackSlug') ?? '').toLowerCase();
      this.selectedGameFilters = this.gameCode ? [this.gameCode] : [];
      this.selectedTrackFilters = this.trackSlug ? [this.trackSlug] : [];
      this.searchForm.patchValue(
        {
          gameCode: this.gameCode,
          trackSlug: this.trackSlug,
          query: '',
        },
        {emitEvent: false},
      );
      this.loadTrackOptionsForGames(this.selectedGameFilters);
      this.loadSetupFields(this.gameCode);
      this.fetchSetups();
      this.fetchRecommendations();
    });

    this.route.queryParamMap.subscribe((query) => {
      const value = query.get('setupId');
      this.requestedModalSetupId = value ? Number(value) : null;
      this.tryOpenRequestedModal();
    });

    this.searchForm.valueChanges
      .pipe(
        debounceTime(250),
        map((value) =>
          JSON.stringify({
            gameCode: (value.gameCode ?? '').trim().toLowerCase(),
            trackSlug: (value.trackSlug ?? '').trim().toLowerCase(),
            query: (value.query ?? '').trim(),
          }),
        ),
        distinctUntilChanged(),
      )
      .subscribe(() => {
        this.runSearchFromForm();
      });
  }

  publish(): void {
    if (this.publishForm.invalid || this.publishing || !this.gameCode || !this.trackSlug) {
      this.publishForm.markAllAsTouched();
      return;
    }

    const value = this.publishForm.getRawValue();
    this.publishing = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.setupService
      .publishSetup({
        gameCode: this.gameCode,
        trackSlug: this.trackSlug,
        title: value.title.trim(),
        notes: value.notes.trim() || null,
        sessionType: value.sessionType || null,
        weatherCondition: value.weatherCondition || null,
        assistsPreset: value.assistsPreset || null,
        inputDevice: value.inputDevice || null,
        fuelLoadKg: value.fuelLoadKg,
        tyreCompound: value.tyreCompound || null,
        setupValues: this.buildSetupValuesPayload(this.setupValuesForm),
      })
      .subscribe({
        next: (setup) => {
          this.publishing = false;
          this.setups = [setup, ...this.setups];
          this.rebuildSetupTree();
          this.successMessage = 'Setup published.';
          this.publishModalOpen = false;
          this.publishForm.patchValue({title: '', notes: '', fuelLoadKg: null});
          this.rebuildSetupValuesForm(this.setupFields);
          this.fetchRecommendations();
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.publishing = false;
          this.errorMessage = this.resolveErrorMessage(error);
          this.cdr.markForCheck();
        },
      });
  }

  openPublishModal(): void {
    this.publishModalOpen = true;
  }

  closePublishModal(): void {
    this.publishModalOpen = false;
  }

  applySearch(): void {
    this.runSearchFromForm();
  }

  clearSearch(): void {
    this.searchForm.setValue(
      {
        gameCode: '',
        trackSlug: '',
        query: '',
      },
      {emitEvent: false},
    );
    this.selectedSessionFilters = [];
    this.selectedWeatherFilters = [];
    this.selectedInputFilters = [];
    this.selectedGameFilters = [];
    this.selectedTrackFilters = [];
    this.trackFilterOptions = [];
    this.runSearchFromForm();
  }

  onGameFiltersChange(values: string[]): void {
    this.selectedGameFilters = [
      ...new Set(values.map((value) => value.trim().toLowerCase())),
    ].filter(Boolean);
    this.selectedTrackFilters = [];
    this.searchForm.controls.gameCode.setValue(
      this.selectedGameFilters.length === 1 ? this.selectedGameFilters[0] : '',
      {emitEvent: false},
    );
    this.searchForm.controls.trackSlug.setValue('', {emitEvent: false});
    this.loadTrackOptionsForGames(this.selectedGameFilters);
    this.runSearchFromForm();
  }

  onTrackFiltersChange(values: string[]): void {
    this.selectedTrackFilters = [
      ...new Set(values.map((value) => value.trim().toLowerCase())),
    ].filter(Boolean);
    this.searchForm.controls.trackSlug.setValue(
      this.selectedTrackFilters.length === 1 ? this.selectedTrackFilters[0] : '',
      {emitEvent: false},
    );
    this.runSearchFromForm();
  }

  onSessionFiltersChange(values: string[]): void {
    this.selectedSessionFilters = [...values];
    this.rebuildSetupTree();
  }

  onWeatherFiltersChange(values: string[]): void {
    this.selectedWeatherFilters = [...values];
    this.rebuildSetupTree();
  }

  onInputFiltersChange(values: string[]): void {
    this.selectedInputFilters = [...values];
    this.rebuildSetupTree();
  }

  get activeFilterTags(): Array<{key: string; value: string; label: string}> {
    const tags: Array<{key: string; value: string; label: string}> = [];
    const form = this.searchForm.getRawValue();
    this.selectedGameFilters.forEach((value) =>
      tags.push({key: 'gameCode', value, label: `Game: ${value.toUpperCase()}`}),
    );
    this.selectedTrackFilters.forEach((value) =>
      tags.push({key: 'trackSlug', value, label: `Track: ${value.toUpperCase()}`}),
    );
    if (form.query.trim()) {
      tags.push({key: 'query', value: form.query.trim(), label: `Search: ${form.query.trim()}`});
    }
    this.selectedSessionFilters.forEach((value) =>
      tags.push({key: 'session', value, label: `Session: ${value}`}),
    );
    this.selectedWeatherFilters.forEach((value) =>
      tags.push({key: 'weather', value, label: `Weather: ${value}`}),
    );
    this.selectedInputFilters.forEach((value) =>
      tags.push({key: 'input', value, label: `Input: ${value}`}),
    );
    return tags;
  }

  removeFilterTag(tag: {key: string; value: string}): void {
    if (tag.key === 'gameCode') {
      this.selectedGameFilters = this.selectedGameFilters.filter((value) => value !== tag.value);
      this.selectedTrackFilters = [];
      this.searchForm.controls.gameCode.setValue(
        this.selectedGameFilters.length === 1 ? this.selectedGameFilters[0] : '',
        {emitEvent: false},
      );
      this.searchForm.controls.trackSlug.setValue('', {emitEvent: false});
      this.loadTrackOptionsForGames(this.selectedGameFilters);
      this.runSearchFromForm();
      return;
    }
    if (tag.key === 'trackSlug') {
      this.selectedTrackFilters = this.selectedTrackFilters.filter((value) => value !== tag.value);
      this.searchForm.controls.trackSlug.setValue(
        this.selectedTrackFilters.length === 1 ? this.selectedTrackFilters[0] : '',
        {emitEvent: false},
      );
      this.runSearchFromForm();
      return;
    }
    if (tag.key === 'query') {
      this.searchForm.controls.query.setValue('');
      return;
    }
    if (tag.key === 'session') {
      this.selectedSessionFilters = this.selectedSessionFilters.filter(
        (item) => item !== tag.value,
      );
    }
    if (tag.key === 'weather') {
      this.selectedWeatherFilters = this.selectedWeatherFilters.filter(
        (item) => item !== tag.value,
      );
    }
    if (tag.key === 'input') {
      this.selectedInputFilters = this.selectedInputFilters.filter((item) => item !== tag.value);
    }
    this.rebuildSetupTree();
  }

  onPaginationPageChange(page: number): void {
    if (page < 0 || this.loading || page === this.page) {
      return;
    }
    if (this.totalPages > 0 && page + 1 > this.totalPages) {
      return;
    }
    this.page = page;
    this.fetchSetups();
  }

  onPaginationPageSizeChange(size: number): void {
    if (this.loading || size === this.pageSize) {
      return;
    }
    this.pageSize = size;
    this.page = 0;
    this.fetchSetups();
  }

  beginEdit(setup: SetupItem): void {
    if (this.setupFields.length === 0) {
      this.errorMessage = 'No setup field schema is available for this game.';
      this.cdr.markForCheck();
      return;
    }

    this.editingSetupId = setup.id;
    this.editTitle = setup.title;
    this.editNotes = setup.notes ?? '';
    this.rebuildEditSetupValuesForm(this.setupFields, setup.setupValues ?? {});
  }

  cancelEdit(): void {
    this.editingSetupId = null;
  }

  saveEdit(setup: SetupItem): void {
    const title = this.editTitle.trim();
    if (title.length < 3) {
      this.errorMessage = 'Title must be at least 3 characters.';
      this.cdr.markForCheck();
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.setupService
      .updateSetup(setup.id, {
        title,
        notes: this.editNotes.trim() || null,
        sessionType: setup.sessionType,
        weatherCondition: setup.weatherCondition,
        assistsPreset: setup.assistsPreset,
        inputDevice: setup.inputDevice,
        fuelLoadKg: setup.fuelLoadKg,
        tyreCompound: setup.tyreCompound,
        setupValues: this.buildSetupValuesPayload(this.editSetupValuesForm),
      })
      .subscribe({
        next: (updated) => {
          this.updateSetupInLists(updated);
          this.editingSetupId = null;
          this.successMessage = 'Setup updated.';
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.errorMessage = this.resolveErrorMessage(error);
          this.cdr.markForCheck();
        },
      });
  }

  deleteSetup(setup: SetupItem): void {
    if (!window.confirm(`Delete setup "${setup.title}"?`)) {
      return;
    }
    this.deletingSetupId = setup.id;
    this.setupService.deleteSetup(setup.id).subscribe({
      next: () => {
        this.deletingSetupId = null;
        this.setups = this.setups.filter((item) => item.id !== setup.id);
        this.rebuildSetupTree();
        this.recommendedSetups = this.recommendedSetups.filter((item) => item.id !== setup.id);
        if (this.selectedSetup?.id === setup.id) {
          this.closeSetupModal();
        }
        this.successMessage = 'Setup deleted.';
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.deletingSetupId = null;
        this.errorMessage = this.resolveErrorMessage(error);
        this.cdr.markForCheck();
      },
    });
  }

  canEdit(setup: SetupItem): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) {
      return false;
    }
    return user.role === 'ADMIN' || (setup.userId !== null && setup.userId === user.id);
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  getFieldControl(fieldKey: string): FormControl {
    return this.setupValuesForm.get(fieldKey) as FormControl;
  }

  getEditFieldControl(fieldKey: string): FormControl {
    return this.editSetupValuesForm.get(fieldKey) as FormControl;
  }

  formatSetupValue(setup: SetupItem, field: SetupFieldDefinition): string {
    const value = setup.setupValues?.[field.fieldKey];
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    if (field.fieldType === 'BOOLEAN') {
      return Boolean(value) ? 'Yes' : 'No';
    }
    return String(value);
  }

  openSetupModal(setup: SetupItem): void {
    this.selectedSetup = setup;
    this.editingSetupId = null;
    this.compareSetupId = null;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {setupId: setup.id},
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  closeSetupModal(): void {
    this.selectedSetup = null;
    this.editingSetupId = null;
    this.compareSetupId = null;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {setupId: null},
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  onModalBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeSetupModal();
    }
  }

  vote(setup: SetupItem, vote: -1 | 1): void {
    const nextVote: -1 | 0 | 1 = setup.userVote === vote ? 0 : vote;
    this.setupService.voteSetup(setup.id, nextVote).subscribe({
      next: (updated) => {
        this.updateSetupInLists(updated);
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.errorMessage = this.resolveErrorMessage(error);
        this.cdr.markForCheck();
      },
    });
  }

  reportSelectedSetup(): void {
    if (!this.selectedSetup) {
      return;
    }
    const reason = this.reportReason.trim();
    if (!reason) {
      this.errorMessage = 'Please provide a report reason.';
      this.cdr.markForCheck();
      return;
    }
    this.setupService.reportSetup(this.selectedSetup.id, reason).subscribe({
      next: () => {
        this.reportReason = '';
        this.successMessage = 'Setup reported. Thank you.';
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.errorMessage = this.resolveErrorMessage(error);
        this.cdr.markForCheck();
      },
    });
  }

  hideSelectedSetup(): void {
    if (!this.selectedSetup) {
      return;
    }
    const reason = window.prompt('Hide reason:');
    if (!reason) {
      return;
    }
    this.setupService.hideSetup(this.selectedSetup.id, reason).subscribe({
      next: (updated) => {
        this.updateSetupInLists(updated);
        this.successMessage = 'Setup hidden.';
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.errorMessage = this.resolveErrorMessage(error);
        this.cdr.markForCheck();
      },
    });
  }

  unhideSelectedSetup(): void {
    if (!this.selectedSetup) {
      return;
    }
    this.setupService.unhideSetup(this.selectedSetup.id).subscribe({
      next: (updated) => {
        this.updateSetupInLists(updated);
        this.successMessage = 'Setup unhidden.';
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.errorMessage = this.resolveErrorMessage(error);
        this.cdr.markForCheck();
      },
    });
  }

  copyShareLink(): void {
    if (!this.selectedSetup) {
      return;
    }
    const url = `${window.location.origin}${window.location.pathname}?setupId=${this.selectedSetup.id}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        this.successMessage = 'Share link copied.';
        this.cdr.markForCheck();
      })
      .catch(() => {
        this.errorMessage = 'Could not copy share link.';
        this.cdr.markForCheck();
      });
  }

  exportSelectedSetup(): void {
    if (!this.selectedSetup) {
      return;
    }
    const payload = {
      title: this.selectedSetup.title,
      notes: this.selectedSetup.notes,
      sessionType: this.selectedSetup.sessionType,
      weatherCondition: this.selectedSetup.weatherCondition,
      assistsPreset: this.selectedSetup.assistsPreset,
      inputDevice: this.selectedSetup.inputDevice,
      fuelLoadKg: this.selectedSetup.fuelLoadKg,
      tyreCompound: this.selectedSetup.tyreCompound,
      setupValues: this.selectedSetup.setupValues,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.selectedSetup.gameCode}-${this.selectedSetup.trackSlug}-${this.selectedSetup.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  importSetupFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result ?? '{}')) as {
          title?: string;
          notes?: string;
          sessionType?: string;
          weatherCondition?: string;
          assistsPreset?: string;
          inputDevice?: string;
          fuelLoadKg?: number | null;
          tyreCompound?: string;
          setupValues?: Record<string, unknown>;
        };
        this.publishForm.patchValue({
          title: parsed.title ?? '',
          notes: parsed.notes ?? '',
          sessionType: parsed.sessionType ?? 'race',
          weatherCondition: parsed.weatherCondition ?? 'dry',
          assistsPreset: parsed.assistsPreset ?? 'full',
          inputDevice: parsed.inputDevice ?? 'wheel',
          fuelLoadKg: parsed.fuelLoadKg ?? null,
          tyreCompound: parsed.tyreCompound ?? 'medium',
        });
        const values = parsed.setupValues ?? {};
        this.setupFields.forEach((field) => {
          const control = this.getFieldControl(field.fieldKey);
          if (!control) {
            return;
          }
          control.setValue(values[field.fieldKey] ?? this.getDefaultFieldValue(field));
        });
        this.successMessage = 'Setup imported into publish form.';
      } catch {
        this.errorMessage = 'Invalid setup file.';
      }
      this.cdr.markForCheck();
    };
    reader.readAsText(file);
    input.value = '';
  }

  get compareSetup(): SetupItem | null {
    if (!this.compareSetupId) {
      return null;
    }
    return this.setups.find((item) => item.id === this.compareSetupId) ?? null;
  }

  get compareCandidates(): SetupItem[] {
    if (!this.selectedSetup) {
      return [];
    }
    return this.setups.filter((item) => item.id !== this.selectedSetup?.id);
  }

  isDifferent(field: SetupFieldDefinition): boolean {
    if (!this.selectedSetup || !this.compareSetup) {
      return false;
    }
    return (
      this.selectedSetup.setupValues[field.fieldKey] !==
      this.compareSetup.setupValues[field.fieldKey]
    );
  }

  openRecommended(setup: SetupItem): void {
    this.openSetupModal(setup);
  }

  toggleGroup(row: SetupTreeRow): void {
    if (row.type !== 'group') {
      return;
    }
    if (this.expandedGroupKeys.has(row.key)) {
      this.expandedGroupKeys.delete(row.key);
    } else {
      this.expandedGroupKeys.add(row.key);
    }
    this.rebuildSetupTree();
  }

  isGroupExpanded(row: SetupTreeRow): boolean {
    return this.expandedGroupKeys.has(row.key);
  }

  trackByTreeRow(_index: number, row: SetupTreeRow): string {
    return row.key;
  }

  private fetchSetups(): void {
    this.loading = true;
    this.errorMessage = '';
    this.setupService
      .searchSetups({
        gameCode: this.gameCode || null,
        trackSlug: this.trackSlug || null,
        query: this.query || null,
        page: this.page,
        size: this.pageSize,
      })
      .subscribe({
        next: (response) => {
          this.setups = response.setups ?? [];
          this.totalPages = response.totalPages ?? 0;
          this.totalSetups = response.totalSetups ?? this.setups.length;
          this.page = response.page ?? 0;
          this.ensureInitialGroupExpansion();
          this.rebuildSetupTree();
          this.loading = false;
          this.tryOpenRequestedModal();
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage = this.resolveErrorMessage(error);
          this.cdr.markForCheck();
        },
      });
  }

  private fetchRecommendations(): void {
    this.setupService.recommendedSetups(this.gameCode || null, 6).subscribe({
      next: (items) => {
        this.recommendedSetups = items;
        this.cdr.markForCheck();
      },
      error: () => {
        this.recommendedSetups = [];
        this.cdr.markForCheck();
      },
    });
  }

  private loadTrackOptionsForGames(gameCodes: string[]): void {
    const normalizedGames = [
      ...new Set(gameCodes.map((value) => value.trim().toLowerCase()).filter(Boolean)),
    ];
    if (normalizedGames.length === 0) {
      this.trackOptions = [];
      this.trackFilterOptions = [];
      this.cdr.markForCheck();
      return;
    }

    const requests = normalizedGames.map((gameCode) =>
      this.trackDiscoveryService.getTracks(gameCode, {size: 100, page: 0}).pipe(
        map((response) =>
          response.tracks.map((track) => ({
            slug: track.slug,
            label: `${track.grandPrixName ?? track.slug} (${track.slug})`,
          })),
        ),
      ),
    );

    forkJoin(requests).subscribe({
      next: (responses) => {
        const unique = new Map<string, TrackAutocompleteOption>();
        responses.flat().forEach((option) => {
          if (!unique.has(option.slug)) {
            unique.set(option.slug, option);
          }
        });
        this.trackOptions = [...unique.values()];
        this.trackFilterOptions = this.trackOptions.map((option) => ({
          value: option.slug,
          label: option.label,
        }));
        this.cdr.markForCheck();
      },
      error: () => {
        this.trackOptions = [];
        this.trackFilterOptions = [];
        this.cdr.markForCheck();
      },
    });
  }

  private loadSetupFields(gameCode: string): void {
    const normalizedGameCode = (gameCode ?? '').trim().toLowerCase();
    if (!normalizedGameCode) {
      this.setupFields = [];
      this.rebuildSetupValuesForm([]);
      this.cdr.markForCheck();
      return;
    }

    this.setupService.getSetupFieldSchema(normalizedGameCode).subscribe({
      next: (fields) => {
        this.setupFields = fields;
        this.rebuildSetupValuesForm(fields);
        this.cdr.markForCheck();
      },
      error: () => {
        this.setupFields = [];
        this.rebuildSetupValuesForm([]);
        this.cdr.markForCheck();
      },
    });
  }

  private runSearchFromForm(): void {
    const values = this.searchForm.getRawValue();
    const nextGameCode = values.gameCode.trim().toLowerCase();
    const nextTrackSlug = values.trackSlug.trim().toLowerCase();
    const nextQuery = values.query.trim();
    const nextSearchKey = `${nextGameCode}|${nextTrackSlug}|${nextQuery}`;
    const gameChanged = nextGameCode !== this.gameCode;

    if (nextSearchKey === this.lastAppliedSearchKey) {
      return;
    }

    this.gameCode = nextGameCode;
    this.trackSlug = nextTrackSlug;
    this.query = nextQuery;
    this.page = 0;
    this.lastAppliedSearchKey = nextSearchKey;

    if (gameChanged) {
      this.loadSetupFields(this.gameCode);
      this.loadTrackOptionsForGames(
        this.selectedGameFilters.length > 0
          ? this.selectedGameFilters
          : this.gameCode
            ? [this.gameCode]
            : [],
      );
      this.fetchRecommendations();
    }
    this.fetchSetups();
  }

  private rebuildSetupValuesForm(fields: SetupFieldDefinition[]): void {
    Object.keys(this.setupValuesForm.controls).forEach((key) =>
      this.setupValuesForm.removeControl(key),
    );
    fields.forEach((field) => {
      this.setupValuesForm.addControl(
        field.fieldKey,
        new FormControl(this.getDefaultFieldValue(field)),
      );
    });
  }

  private rebuildEditSetupValuesForm(
    fields: SetupFieldDefinition[],
    sourceValues: Record<string, unknown>,
  ): void {
    Object.keys(this.editSetupValuesForm.controls).forEach((key) =>
      this.editSetupValuesForm.removeControl(key),
    );
    fields.forEach((field) => {
      const value = sourceValues[field.fieldKey];
      this.editSetupValuesForm.addControl(
        field.fieldKey,
        new FormControl(
          value === null || value === undefined ? this.getDefaultFieldValue(field) : value,
        ),
      );
    });
  }

  private buildSetupValuesPayload(form: FormGroup): Record<string, unknown> {
    const rawValues = form.getRawValue();
    const payload: Record<string, unknown> = {};
    this.setupFields.forEach((field) => {
      const raw = rawValues[field.fieldKey];
      if (field.fieldType === 'NUMBER') {
        payload[field.fieldKey] =
          raw === '' || raw === null || raw === undefined ? null : Number(raw);
      } else {
        payload[field.fieldKey] = raw;
      }
    });
    return payload;
  }

  private getDefaultFieldValue(field: SetupFieldDefinition): unknown {
    return field.fieldType === 'BOOLEAN' ? false : '';
  }

  private updateSetupInLists(updated: SetupItem): void {
    this.setups = this.setups.map((item) => (item.id === updated.id ? updated : item));
    this.recommendedSetups = this.recommendedSetups.map((item) =>
      item.id === updated.id ? updated : item,
    );
    this.rebuildSetupTree();
    if (this.selectedSetup?.id === updated.id) {
      this.selectedSetup = updated;
    }
  }

  private tryOpenRequestedModal(): void {
    if (!this.requestedModalSetupId) {
      return;
    }
    const target = this.setups.find((item) => item.id === this.requestedModalSetupId);
    if (target) {
      this.selectedSetup = target;
    }
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      return error.error?.message ?? `Request failed (status ${error.status}).`;
    }
    return 'Request failed.';
  }

  private ensureInitialGroupExpansion(): void {
    this.expandedGroupKeys.clear();
    this.setups.forEach((setup) => {
      const game = this.normalizeGroupValue(setup.gameCode, 'unknown-game').toUpperCase();
      const track = this.normalizeGroupValue(setup.trackSlug, 'unknown-track').toUpperCase();
      const session = this.normalizeGroupValue(setup.sessionType, 'unspecified').toUpperCase();
      const weather = this.normalizeGroupValue(setup.weatherCondition, 'unspecified').toUpperCase();
      const gameKey = `g:${game}`;
      const trackKey = `${gameKey}${SetupPublisherPageComponent.GROUP_SEPARATOR}t:${track}`;
      const sessionKey = `${trackKey}${SetupPublisherPageComponent.GROUP_SEPARATOR}s:${session}`;
      const weatherKey = `${sessionKey}${SetupPublisherPageComponent.GROUP_SEPARATOR}c:${weather}`;
      this.expandedGroupKeys.add(gameKey);
      this.expandedGroupKeys.add(trackKey);
      this.expandedGroupKeys.add(sessionKey);
      this.expandedGroupKeys.add(weatherKey);
    });
  }

  private rebuildSetupTree(): void {
    const rows: SetupTreeRow[] = [];
    const filtered = this.setups.filter((setup) => this.matchesMultiFilters(setup));
    this.filteredSetups = filtered.length;
    const sorted = [...filtered].sort((left, right) => {
      const gameSort = this.compareText(left.gameCode, right.gameCode);
      if (gameSort !== 0) return gameSort;
      const trackSort = this.compareText(left.trackSlug, right.trackSlug);
      if (trackSort !== 0) return trackSort;
      const sessionSort = this.compareText(left.sessionType ?? '', right.sessionType ?? '');
      if (sessionSort !== 0) return sessionSort;
      const weatherSort = this.compareText(
        left.weatherCondition ?? '',
        right.weatherCondition ?? '',
      );
      if (weatherSort !== 0) return weatherSort;
      return this.compareText(left.title, right.title);
    });

    const gameGroups = new Map<string, SetupItem[]>();
    sorted.forEach((setup) => {
      const game = this.normalizeGroupValue(setup.gameCode, 'unknown-game').toUpperCase();
      const key = `g:${game}`;
      gameGroups.set(key, [...(gameGroups.get(key) ?? []), setup]);
    });

    [...gameGroups.entries()].forEach(([gameKey, gameItems]) => {
      rows.push({
        type: 'group',
        level: 0,
        key: gameKey,
        label: gameKey.replace(/^g:/, ''),
        count: gameItems.length,
      });
      if (!this.expandedGroupKeys.has(gameKey)) return;

      const trackGroups = new Map<string, SetupItem[]>();
      gameItems.forEach((setup) => {
        const track = this.normalizeGroupValue(setup.trackSlug, 'unknown-track').toUpperCase();
        const key = `${gameKey}${SetupPublisherPageComponent.GROUP_SEPARATOR}t:${track}`;
        trackGroups.set(key, [...(trackGroups.get(key) ?? []), setup]);
      });

      [...trackGroups.entries()].forEach(([trackKey, trackItems]) => {
        rows.push({
          type: 'group',
          level: 1,
          key: trackKey,
          label: trackKey.split('t:')[1],
          count: trackItems.length,
        });
        if (!this.expandedGroupKeys.has(trackKey)) return;

        const sessionGroups = new Map<string, SetupItem[]>();
        trackItems.forEach((setup) => {
          const session = this.normalizeGroupValue(setup.sessionType, 'unspecified').toUpperCase();
          const key = `${trackKey}${SetupPublisherPageComponent.GROUP_SEPARATOR}s:${session}`;
          sessionGroups.set(key, [...(sessionGroups.get(key) ?? []), setup]);
        });

        [...sessionGroups.entries()].forEach(([sessionKey, sessionItems]) => {
          rows.push({
            type: 'group',
            level: 2,
            key: sessionKey,
            label: sessionKey.split('s:')[1],
            count: sessionItems.length,
          });
          if (!this.expandedGroupKeys.has(sessionKey)) return;

          const conditionGroups = new Map<string, SetupItem[]>();
          sessionItems.forEach((setup) => {
            const condition = this.normalizeGroupValue(
              setup.weatherCondition,
              'unspecified',
            ).toUpperCase();
            const key = `${sessionKey}${SetupPublisherPageComponent.GROUP_SEPARATOR}c:${condition}`;
            conditionGroups.set(key, [...(conditionGroups.get(key) ?? []), setup]);
          });

          [...conditionGroups.entries()].forEach(([conditionKey, conditionItems]) => {
            rows.push({
              type: 'group',
              level: 3,
              key: conditionKey,
              label: conditionKey.split('c:')[1],
              count: conditionItems.length,
            });
            if (!this.expandedGroupKeys.has(conditionKey)) return;

            conditionItems.forEach((setup) => {
              rows.push({
                type: 'setup',
                level: 4,
                key: `setup:${setup.id}`,
                setup,
              });
            });
          });
        });
      });
    });

    this.treeRows = rows;
  }

  private matchesMultiFilters(setup: SetupItem): boolean {
    const game = (setup.gameCode ?? '').toLowerCase();
    const track = (setup.trackSlug ?? '').toLowerCase();
    const session = (setup.sessionType ?? '').toLowerCase();
    const weather = (setup.weatherCondition ?? '').toLowerCase();
    const input = (setup.inputDevice ?? '').toLowerCase();
    const gameMatch =
      this.selectedGameFilters.length === 0 || this.selectedGameFilters.includes(game);
    const trackMatch =
      this.selectedTrackFilters.length === 0 || this.selectedTrackFilters.includes(track);
    const sessionMatch =
      this.selectedSessionFilters.length === 0 || this.selectedSessionFilters.includes(session);
    const weatherMatch =
      this.selectedWeatherFilters.length === 0 || this.selectedWeatherFilters.includes(weather);
    const inputMatch =
      this.selectedInputFilters.length === 0 || this.selectedInputFilters.includes(input);
    return gameMatch && trackMatch && sessionMatch && weatherMatch && inputMatch;
  }

  private normalizeGroupValue(value: string | null | undefined, fallback: string): string {
    const normalized = (value ?? '').trim();
    return normalized.length > 0 ? normalized : fallback;
  }

  private compareText(left: string | null | undefined, right: string | null | undefined): number {
    return (left ?? '').localeCompare(right ?? '', undefined, {sensitivity: 'base'});
  }
}

type SetupTreeRow =
  | {type: 'group'; level: 0 | 1 | 2 | 3; key: string; label: string; count: number}
  | {type: 'setup'; level: 4; key: string; setup: SetupItem};
