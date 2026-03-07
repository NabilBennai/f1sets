import {HttpErrorResponse} from '@angular/common/http';
import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {FormControl, FormGroup, Validators, ReactiveFormsModule, FormsModule} from '@angular/forms';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
import {ActivatedRoute, Router} from '@angular/router';
import {debounceTime, distinctUntilChanged, map} from 'rxjs/operators';
import {forkJoin} from 'rxjs';
import {AuthService} from '../../../auth/data-access/auth.service';
import {TrackDiscoveryService} from '../../../discovery/data-access/track-discovery.service';
import {SetupService} from '../../data-access/setup.service';
import {
  AiDifficultyCalculationResponse,
  SetupFieldDefinition,
  SetupItem,
} from '../../models/setup.models';
import {TrackAutocompleteOption} from '../../../../shared/components/track-autocomplete-input/track-autocomplete-input.component';
import {UpperCasePipe, DatePipe} from '@angular/common';
import {ErpPaginationComponent} from '../../../../shared/components/erp-pagination/erp-pagination.component';
import {
  MultiAutocompleteFilterComponent,
  MultiFilterOption,
} from '../../../../shared/components/multi-autocomplete-filter/multi-autocomplete-filter.component';

type PublishFormGroup = FormGroup<{
  gameCode: FormControl<string>;
  trackSlug: FormControl<string>;
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

type AiDifficultyFormGroup = FormGroup<{
  lapTime: FormControl<string>;
}>;

type SetupLibraryView = 'all' | 'mine' | 'favorites';

interface SetupLocalComment {
  id: number;
  setupId: number;
  author: string;
  text: string;
  createdAt: string;
}

type SetupSortOption = 'title' | 'score' | 'newest';

interface SetupFilterPreset {
  id: string;
  name: string;
  gameFilters: string[];
  trackFilters: string[];
  sessionFilters: string[];
  weatherFilters: string[];
  inputFilters: string[];
  query: string;
  libraryView: SetupLibraryView;
  sortOption: SetupSortOption;
}

@Component({
  selector: 'app-setup-publisher-page',
  templateUrl: './setup-publisher-page.component.html',
  styleUrl: './setup-publisher-page.component.scss',
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    TranslateModule,
    UpperCasePipe,
    DatePipe,
    ErpPaginationComponent,
    MultiAutocompleteFilterComponent,
  ],
})
export class SetupPublisherPageComponent implements OnInit {
  private static readonly GROUP_SEPARATOR = '||';
  private readonly favoritesStorageKey = 'f1sets.setups.favorites';
  private readonly commentsStorageKey = 'f1sets.setups.comments';
  private readonly filterPresetsStorageKey = 'f1sets.setups.filter-presets';
  private readonly recentSetupsStorageKey = 'f1sets.setups.recent';
  readonly publishForm: PublishFormGroup = new FormGroup({
    gameCode: new FormControl('', {nonNullable: true, validators: [Validators.required]}),
    trackSlug: new FormControl('', {nonNullable: true, validators: [Validators.required]}),
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
  readonly aiDifficultyForm: AiDifficultyFormGroup = new FormGroup({
    lapTime: new FormControl('', {nonNullable: true, validators: [Validators.required]}),
  });

  gameCode = '';
  trackSlug = '';
  query = '';
  aiDifficultyLoading = false;
  aiDifficultyError = '';
  aiDifficultyCurveAvailable = false;
  aiDifficultyCurveVersion: number | null = null;
  aiDifficultySource: string | null = null;
  aiDifficultyResult: AiDifficultyCalculationResponse | null = null;
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
  newCommentText = '';
  newPresetName = '';
  setupLibraryView: SetupLibraryView = 'all';
  selectedSortOption: SetupSortOption = 'title';
  filterPresets: SetupFilterPreset[] = [];
  selectedGameFilters: string[] = [];
  selectedTrackFilters: string[] = [];
  selectedSessionFilters: string[] = [];
  selectedWeatherFilters: string[] = [];
  selectedInputFilters: string[] = [];
  private lastAppliedSearchKey = '';
  private requestedModalSetupId: number | null = null;
  private pendingSetupValuesPrefill: Record<string, unknown> | null = null;
  private favoriteSetupIds = new Set<number>();
  private setupComments: SetupLocalComment[] = [];

  readonly sessionOptions = ['race', 'qualifying', 'time-trial'];
  readonly weatherOptions = ['dry', 'mixed', 'wet'];
  readonly inputDeviceOptions = ['wheel', 'controller', 'keyboard'];
  readonly gameFilterOptions: MultiFilterOption[] = [
    {value: 'f12025', label: 'EA SPORTS F1 25'},
    {value: 'f12024', label: 'EA SPORTS F1 24'},
    {value: 'f12023', label: 'EA SPORTS F1 23'},
  ];
  publishTrackOptions: TrackAutocompleteOption[] = [];
  trackFilterOptions: MultiFilterOption[] = [];
  readonly sessionFilterOptions: MultiFilterOption[] = this.sessionOptions.map((value) => ({
    value,
    label: `setups.enums.session.${value}`,
  }));
  readonly weatherFilterOptions: MultiFilterOption[] = this.weatherOptions.map((value) => ({
    value,
    label: `setups.enums.weather.${value}`,
  }));
  readonly inputDeviceFilterOptions: MultiFilterOption[] = this.inputDeviceOptions.map((value) => ({
    value,
    label: `setups.enums.input.${value}`,
  }));
  readonly sortOptions: Array<{value: SetupSortOption; labelKey: string}> = [
    {value: 'title', labelKey: 'setups.sort.options.title'},
    {value: 'score', labelKey: 'setups.sort.options.score'},
    {value: 'newest', labelKey: 'setups.sort.options.newest'},
  ];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly setupService: SetupService,
    private readonly authService: AuthService,
    private readonly trackDiscoveryService: TrackDiscoveryService,
    private readonly translateService: TranslateService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadFavoriteSetupIdsFromStorage();
    this.loadSetupCommentsFromStorage();
    this.loadFilterPresetsFromStorage();

    this.route.paramMap.subscribe((params) => {
      this.gameCode = (params.get('gameCode') ?? '').toLowerCase();
      this.trackSlug = (params.get('trackSlug') ?? '').toLowerCase();
      this.aiDifficultyError = '';
      this.aiDifficultyResult = null;
      this.aiDifficultyCurveAvailable = false;
      this.aiDifficultyCurveVersion = null;
      this.aiDifficultySource = null;
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
      this.publishForm.patchValue(
        {
          gameCode: this.gameCode,
          trackSlug: this.trackSlug,
        },
        {emitEvent: false},
      );
      this.loadTrackOptionsForGames(this.selectedGameFilters);
      this.loadPublishTrackOptions(this.gameCode, this.trackSlug);
      this.loadSetupFields(this.gameCode);
      this.loadAiDifficultyCurve();
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
    if (this.publishForm.invalid || this.publishing) {
      this.publishForm.markAllAsTouched();
      return;
    }

    const value = this.publishForm.getRawValue();
    const normalizedGameCode = value.gameCode.trim().toLowerCase();
    const normalizedTrackSlug = value.trackSlug.trim().toLowerCase();
    if (!normalizedGameCode || !normalizedTrackSlug) {
      this.publishForm.markAllAsTouched();
      return;
    }
    this.publishing = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.setupService
      .publishSetup({
        gameCode: normalizedGameCode,
        trackSlug: normalizedTrackSlug,
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
          this.successMessage = this.translateService.instant('setups.messages.published');
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
    const preferredGameCode =
      this.publishForm.controls.gameCode.getRawValue().trim().toLowerCase() ||
      this.gameCode ||
      this.selectedGameFilters[0] ||
      this.gameFilterOptions[0]?.value ||
      '';
    const preferredTrackSlug =
      this.publishForm.controls.trackSlug.getRawValue().trim().toLowerCase() ||
      this.trackSlug ||
      '';
    this.publishForm.patchValue(
      {
        gameCode: preferredGameCode,
        trackSlug: preferredTrackSlug,
      },
      {emitEvent: false},
    );
    this.loadPublishTrackOptions(preferredGameCode, preferredTrackSlug);
    this.loadSetupFields(preferredGameCode);
    this.publishModalOpen = true;
  }

  onPublishGameChange(gameCode: string): void {
    const normalizedGameCode = gameCode.trim().toLowerCase();
    this.publishForm.controls.gameCode.setValue(normalizedGameCode, {emitEvent: false});
    this.publishForm.controls.trackSlug.setValue('', {emitEvent: false});
    this.loadPublishTrackOptions(normalizedGameCode, '');
    this.loadSetupFields(normalizedGameCode);
  }

  onPublishTrackChange(trackSlug: string): void {
    this.publishForm.controls.trackSlug.setValue(trackSlug.trim().toLowerCase(), {
      emitEvent: false,
    });
  }

  calculateAiDifficulty(): void {
    if (this.aiDifficultyLoading || !this.gameCode || !this.trackSlug) {
      return;
    }

    const lapTimeInput = this.aiDifficultyForm.controls.lapTime.getRawValue();
    const lapTimeMs = this.parseLapTimeToMs(lapTimeInput);
    if (lapTimeMs === null) {
      this.aiDifficultyError = this.translateService.instant('setups.ai.invalidLapTime');
      this.aiDifficultyResult = null;
      this.cdr.markForCheck();
      return;
    }

    this.aiDifficultyLoading = true;
    this.aiDifficultyError = '';
    this.aiDifficultyResult = null;
    this.setupService.calculateAiDifficulty(this.gameCode, this.trackSlug, {lapTimeMs}).subscribe({
      next: (result) => {
        this.aiDifficultyLoading = false;
        this.aiDifficultyResult = result;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.aiDifficultyLoading = false;
        this.aiDifficultyError = this.resolveErrorMessage(error);
        this.cdr.markForCheck();
      },
    });
  }

  closePublishModal(): void {
    this.publishModalOpen = false;
  }

  applySearch(): void {
    this.runSearchFromForm();
  }

  get publishReadinessChecks(): Array<{labelKey: string; done: boolean}> {
    const formValue = this.publishForm.getRawValue();
    const hasSetupFieldValues = Object.values(this.setupValuesForm.getRawValue()).some((value) => {
      if (typeof value === 'boolean') {
        return value;
      }
      if (typeof value === 'number') {
        return Number.isFinite(value);
      }
      if (typeof value === 'string') {
        return value.trim().length > 0;
      }
      return value !== null && value !== undefined;
    });

    return [
      {
        labelKey: 'setups.automation.checks.targetTrack',
        done: Boolean(formValue.gameCode.trim() && formValue.trackSlug.trim()),
      },
      {
        labelKey: 'setups.automation.checks.title',
        done: formValue.title.trim().length >= 3,
      },
      {
        labelKey: 'setups.automation.checks.schema',
        done: this.setupFields.length > 0,
      },
      {
        labelKey: 'setups.automation.checks.values',
        done: hasSetupFieldValues,
      },
    ];
  }

  get publishReadinessPercent(): number {
    if (this.publishReadinessChecks.length === 0) {
      return 0;
    }
    const completed = this.publishReadinessChecks.filter((check) => check.done).length;
    return Math.round((completed / this.publishReadinessChecks.length) * 100);
  }

  setLibraryView(view: SetupLibraryView): void {
    if (view === 'mine' && !this.authService.isAuthenticated()) {
      this.errorMessage = this.translateService.instant('setups.messages.signInRequiredForMine');
      this.cdr.markForCheck();
      return;
    }
    this.setupLibraryView = view;
    this.rebuildSetupTree();
  }

  setSortOption(option: SetupSortOption): void {
    this.selectedSortOption = option;
    this.rebuildSetupTree();
  }

  libraryViewLabelKey(view: SetupLibraryView): string {
    return `setups.library.views.${view}`;
  }

  get libraryAllCount(): number {
    return this.setups.length;
  }

  get libraryMineCount(): number {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return 0;
    }
    return this.setups.filter((setup) => setup.userId === currentUser.id).length;
  }

  get libraryFavoritesCount(): number {
    return this.setups.filter((setup) => this.favoriteSetupIds.has(setup.id)).length;
  }

  get visibleSetupItems(): SetupItem[] {
    return this.treeRows
      .filter((row): row is Extract<SetupTreeRow, {type: 'setup'}> => row.type === 'setup')
      .map((row) => row.setup);
  }

  saveCurrentFiltersAsPreset(): void {
    const presetName = this.newPresetName.trim();
    if (!presetName) {
      this.errorMessage = this.translateService.instant('setups.messages.presetNameRequired');
      this.cdr.markForCheck();
      return;
    }
    const raw = this.searchForm.getRawValue();
    const preset: SetupFilterPreset = {
      id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: presetName,
      gameFilters: [...this.selectedGameFilters],
      trackFilters: [...this.selectedTrackFilters],
      sessionFilters: [...this.selectedSessionFilters],
      weatherFilters: [...this.selectedWeatherFilters],
      inputFilters: [...this.selectedInputFilters],
      query: raw.query.trim(),
      libraryView: this.setupLibraryView,
      sortOption: this.selectedSortOption,
    };
    this.filterPresets = [preset, ...this.filterPresets].slice(0, 12);
    this.persistFilterPresets();
    this.newPresetName = '';
    this.successMessage = this.translateService.instant('setups.messages.presetSaved');
    this.cdr.markForCheck();
  }

  applyFilterPreset(presetId: string): void {
    const preset = this.filterPresets.find((item) => item.id === presetId);
    if (!preset) {
      return;
    }
    this.selectedGameFilters = [...preset.gameFilters];
    this.selectedTrackFilters = [...preset.trackFilters];
    this.selectedSessionFilters = [...preset.sessionFilters];
    this.selectedWeatherFilters = [...preset.weatherFilters];
    this.selectedInputFilters = [...preset.inputFilters];
    this.setupLibraryView = preset.libraryView;
    this.selectedSortOption = preset.sortOption;
    this.searchForm.patchValue(
      {
        gameCode: this.selectedGameFilters.length === 1 ? this.selectedGameFilters[0] : '',
        trackSlug: this.selectedTrackFilters.length === 1 ? this.selectedTrackFilters[0] : '',
        query: preset.query,
      },
      {emitEvent: false},
    );
    this.loadTrackOptionsForGames(this.selectedGameFilters);
    this.runSearchFromForm();
  }

  deleteFilterPreset(presetId: string): void {
    this.filterPresets = this.filterPresets.filter((item) => item.id !== presetId);
    this.persistFilterPresets();
    this.cdr.markForCheck();
  }

  exportVisibleSetupsCsv(): void {
    const visibleSetups = this.visibleSetupItems;
    if (visibleSetups.length === 0) {
      this.errorMessage = this.translateService.instant('setups.messages.noRowsToExport');
      this.cdr.markForCheck();
      return;
    }

    const headers = [
      'id',
      'gameCode',
      'trackSlug',
      'title',
      'score',
      'upvotes',
      'downvotes',
      'sessionType',
      'weatherCondition',
      'inputDevice',
      'createdAt',
    ];
    const escapeCsv = (value: unknown): string => {
      const raw = value === null || value === undefined ? '' : String(value);
      return `"${raw.replace(/"/g, '""')}"`;
    };
    const rows = visibleSetups.map((setup) =>
      [
        setup.id,
        setup.gameCode,
        setup.trackSlug,
        setup.title,
        setup.score,
        setup.upvotes,
        setup.downvotes,
        setup.sessionType ?? '',
        setup.weatherCondition ?? '',
        setup.inputDevice ?? '',
        setup.createdAt,
      ]
        .map(escapeCsv)
        .join(','),
    );
    const csv = `${headers.join(',')}\n${rows.join('\n')}`;
    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `setups-export-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.successMessage = this.translateService.instant('setups.messages.csvExported', {
      count: visibleSetups.length,
    });
    this.cdr.markForCheck();
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
      tags.push({
        key: 'gameCode',
        value,
        label: this.translateService.instant('setups.filters.tags.game', {
          value: value.toUpperCase(),
        }),
      }),
    );
    this.selectedTrackFilters.forEach((value) =>
      tags.push({
        key: 'trackSlug',
        value,
        label: this.translateService.instant('setups.filters.tags.track', {
          value: value.toUpperCase(),
        }),
      }),
    );
    if (form.query.trim()) {
      tags.push({
        key: 'query',
        value: form.query.trim(),
        label: this.translateService.instant('setups.filters.tags.search', {
          value: form.query.trim(),
        }),
      });
    }
    this.selectedSessionFilters.forEach((value) =>
      tags.push({
        key: 'session',
        value,
        label: this.translateService.instant('setups.filters.tags.session', {
          value: this.translateService.instant(`setups.enums.session.${value}`),
        }),
      }),
    );
    this.selectedWeatherFilters.forEach((value) =>
      tags.push({
        key: 'weather',
        value,
        label: this.translateService.instant('setups.filters.tags.weather', {
          value: this.translateService.instant(`setups.enums.weather.${value}`),
        }),
      }),
    );
    this.selectedInputFilters.forEach((value) =>
      tags.push({
        key: 'input',
        value,
        label: this.translateService.instant('setups.filters.tags.input', {
          value: this.translateService.instant(`setups.enums.input.${value}`),
        }),
      }),
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
      this.errorMessage = this.translateService.instant('setups.messages.noSchema');
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
      this.errorMessage = this.translateService.instant('setups.messages.titleMinLength');
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
          this.successMessage = this.translateService.instant('setups.messages.updated');
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.errorMessage = this.resolveErrorMessage(error);
          this.cdr.markForCheck();
        },
      });
  }

  deleteSetup(setup: SetupItem): void {
    if (
      !window.confirm(
        this.translateService.instant('setups.messages.confirmDelete', {
          title: setup.title,
        }),
      )
    ) {
      return;
    }
    this.deletingSetupId = setup.id;
    this.setupService.deleteSetup(setup.id).subscribe({
      next: () => {
        this.deletingSetupId = null;
        this.favoriteSetupIds.delete(setup.id);
        this.persistFavoriteSetupIds();
        this.setupComments = this.setupComments.filter((comment) => comment.setupId !== setup.id);
        this.persistSetupComments();
        this.setups = this.setups.filter((item) => item.id !== setup.id);
        this.rebuildSetupTree();
        this.recommendedSetups = this.recommendedSetups.filter((item) => item.id !== setup.id);
        if (this.selectedSetup?.id === setup.id) {
          this.closeSetupModal();
        }
        this.successMessage = this.translateService.instant('setups.messages.deleted');
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
      return this.translateService.instant('common.notAvailable');
    }
    if (field.fieldType === 'BOOLEAN') {
      return Boolean(value)
        ? this.translateService.instant('common.yes')
        : this.translateService.instant('common.no');
    }
    return String(value);
  }

  openSetupModal(setup: SetupItem): void {
    this.selectedSetup = setup;
    this.editingSetupId = null;
    this.compareSetupId = null;
    this.newCommentText = '';
    this.recordRecentSetup(setup);
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
    this.newCommentText = '';
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

  isFavorite(setup: SetupItem | number): boolean {
    const setupId = typeof setup === 'number' ? setup : setup.id;
    return this.favoriteSetupIds.has(setupId);
  }

  toggleFavorite(setup: SetupItem, event?: Event): void {
    event?.stopPropagation();
    if (this.favoriteSetupIds.has(setup.id)) {
      this.favoriteSetupIds.delete(setup.id);
      this.successMessage = this.translateService.instant('setups.messages.removedFromFavorites');
    } else {
      this.favoriteSetupIds.add(setup.id);
      this.successMessage = this.translateService.instant('setups.messages.addedToFavorites');
    }
    this.persistFavoriteSetupIds();
    this.rebuildSetupTree();
    this.cdr.markForCheck();
  }

  getSetupCommentCount(setupId: number): number {
    return this.setupComments.filter((comment) => comment.setupId === setupId).length;
  }

  get selectedSetupComments(): SetupLocalComment[] {
    if (!this.selectedSetup) {
      return [];
    }
    return this.setupComments
      .filter((comment) => comment.setupId === this.selectedSetup?.id)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  addCommentToSelectedSetup(): void {
    if (!this.selectedSetup) {
      return;
    }
    const text = this.newCommentText.trim();
    if (!text) {
      return;
    }
    const currentUser = this.authService.getCurrentUser();
    const nextComment: SetupLocalComment = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      setupId: this.selectedSetup.id,
      author:
        currentUser?.displayName ?? this.translateService.instant('setups.collab.guestAuthor'),
      text,
      createdAt: new Date().toISOString(),
    };
    this.setupComments = [nextComment, ...this.setupComments];
    this.persistSetupComments();
    this.newCommentText = '';
    this.successMessage = this.translateService.instant('setups.messages.commentAdded');
    this.cdr.markForCheck();
  }

  deleteComment(commentId: number): void {
    this.setupComments = this.setupComments.filter((comment) => comment.id !== commentId);
    this.persistSetupComments();
    this.cdr.markForCheck();
  }

  reportSelectedSetup(): void {
    if (!this.selectedSetup) {
      return;
    }
    const reason = this.reportReason.trim();
    if (!reason) {
      this.errorMessage = this.translateService.instant('setups.messages.reportReasonRequired');
      this.cdr.markForCheck();
      return;
    }
    this.setupService.reportSetup(this.selectedSetup.id, reason).subscribe({
      next: () => {
        this.reportReason = '';
        this.successMessage = this.translateService.instant('setups.messages.reported');
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
    const reason = window.prompt(this.translateService.instant('setups.messages.hideReasonPrompt'));
    if (!reason) {
      return;
    }
    this.setupService.hideSetup(this.selectedSetup.id, reason).subscribe({
      next: (updated) => {
        this.updateSetupInLists(updated);
        this.successMessage = this.translateService.instant('setups.messages.hidden');
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
        this.successMessage = this.translateService.instant('setups.messages.unhidden');
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
        this.successMessage = this.translateService.instant('setups.messages.shareLinkCopied');
        this.cdr.markForCheck();
      })
      .catch(() => {
        this.errorMessage = this.translateService.instant('setups.messages.shareLinkCopyFailed');
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

  duplicateSelectedSetupToDraft(): void {
    if (!this.selectedSetup) {
      return;
    }
    const setup = this.selectedSetup;
    this.pendingSetupValuesPrefill = {...(setup.setupValues ?? {})};
    this.publishForm.patchValue(
      {
        gameCode: setup.gameCode,
        trackSlug: setup.trackSlug,
        title: `${setup.title} (Copy)`,
        notes: setup.notes ?? '',
        sessionType: setup.sessionType ?? 'race',
        weatherCondition: setup.weatherCondition ?? 'dry',
        assistsPreset: setup.assistsPreset ?? 'full',
        inputDevice: setup.inputDevice ?? 'wheel',
        fuelLoadKg: setup.fuelLoadKg,
        tyreCompound: setup.tyreCompound ?? 'medium',
      },
      {emitEvent: false},
    );
    this.loadPublishTrackOptions(setup.gameCode, setup.trackSlug);
    this.loadSetupFields(setup.gameCode);
    this.closeSetupModal();
    this.openPublishModal();
    this.successMessage = this.translateService.instant('setups.messages.duplicatedToDraft');
    this.cdr.markForCheck();
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
        this.successMessage = this.translateService.instant('setups.messages.imported');
      } catch {
        this.errorMessage = this.translateService.instant('setups.messages.invalidSetupFile');
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

  private loadPublishTrackOptions(gameCode: string, preferredTrackSlug: string): void {
    const normalizedGameCode = (gameCode ?? '').trim().toLowerCase();
    const normalizedPreferredTrack = (preferredTrackSlug ?? '').trim().toLowerCase();
    if (!normalizedGameCode) {
      this.publishTrackOptions = [];
      this.publishForm.controls.trackSlug.setValue('', {emitEvent: false});
      this.cdr.markForCheck();
      return;
    }
    this.trackDiscoveryService.getTracks(normalizedGameCode, {size: 100, page: 0}).subscribe({
      next: (response) => {
        this.publishTrackOptions = response.tracks.map((track) => ({
          slug: track.slug,
          label: `${track.grandPrixName ?? track.slug} (${track.slug})`,
        }));
        const availableTrackSlugs = new Set(this.publishTrackOptions.map((option) => option.slug));
        const currentTrackSlug = this.publishForm.controls.trackSlug
          .getRawValue()
          .trim()
          .toLowerCase();
        const nextTrackSlug =
          (normalizedPreferredTrack && availableTrackSlugs.has(normalizedPreferredTrack)
            ? normalizedPreferredTrack
            : currentTrackSlug && availableTrackSlugs.has(currentTrackSlug)
              ? currentTrackSlug
              : this.publishTrackOptions[0]?.slug) ?? '';
        this.publishForm.controls.trackSlug.setValue(nextTrackSlug, {emitEvent: false});
        this.cdr.markForCheck();
      },
      error: () => {
        this.publishTrackOptions = [];
        this.publishForm.controls.trackSlug.setValue('', {emitEvent: false});
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
        if (this.pendingSetupValuesPrefill) {
          this.applyValuesToForm(this.setupValuesForm, this.pendingSetupValuesPrefill);
          this.pendingSetupValuesPrefill = null;
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.setupFields = [];
        this.rebuildSetupValuesForm([]);
        this.cdr.markForCheck();
      },
    });
  }

  private loadAiDifficultyCurve(): void {
    if (!this.gameCode || !this.trackSlug) {
      this.aiDifficultyCurveAvailable = false;
      this.aiDifficultyCurveVersion = null;
      this.aiDifficultySource = null;
      this.cdr.markForCheck();
      return;
    }

    this.setupService.getAiDifficultyCurve(this.gameCode, this.trackSlug).subscribe({
      next: (curve) => {
        this.aiDifficultyCurveAvailable = true;
        this.aiDifficultyCurveVersion = curve.curveVersion ?? null;
        this.aiDifficultySource = curve.source ?? null;
        this.cdr.markForCheck();
      },
      error: () => {
        this.aiDifficultyCurveAvailable = false;
        this.aiDifficultyCurveVersion = null;
        this.aiDifficultySource = null;
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

  private applyValuesToForm(form: FormGroup, values: Record<string, unknown>): void {
    this.setupFields.forEach((field) => {
      const control = form.get(field.fieldKey) as FormControl | null;
      if (!control) {
        return;
      }
      const value = values[field.fieldKey];
      control.setValue(
        value === null || value === undefined ? this.getDefaultFieldValue(field) : value,
      );
    });
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
      return (
        error.error?.message ??
        this.translateService.instant('common.requestFailedWithStatus', {status: error.status})
      );
    }
    return this.translateService.instant('common.requestFailed');
  }

  private parseLapTimeToMs(rawValue: string): number | null {
    const value = rawValue.trim().replace(',', '.');
    if (!value) {
      return null;
    }

    const minuteSecondPattern = /^(\d+):([0-5]?\d)(?:\.(\d{1,3}))?$/;
    const secondsPattern = /^(\d+)(?:\.(\d{1,3}))?$/;

    const minuteSecondMatch = value.match(minuteSecondPattern);
    if (minuteSecondMatch) {
      const minutes = Number(minuteSecondMatch[1]);
      const seconds = Number(minuteSecondMatch[2]);
      const milliseconds =
        minuteSecondMatch[3] === undefined
          ? 0
          : Number(minuteSecondMatch[3].padEnd(3, '0').slice(0, 3));
      const totalMs = minutes * 60_000 + seconds * 1000 + milliseconds;
      return totalMs > 0 ? totalMs : null;
    }

    const secondsMatch = value.match(secondsPattern);
    if (secondsMatch) {
      const seconds = Number(secondsMatch[1]);
      const milliseconds =
        secondsMatch[2] === undefined ? 0 : Number(secondsMatch[2].padEnd(3, '0').slice(0, 3));
      const totalMs = seconds * 1000 + milliseconds;
      return totalMs > 0 ? totalMs : null;
    }

    return null;
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
    const filtered = this.setups.filter(
      (setup) => this.matchesLibraryFilter(setup) && this.matchesMultiFilters(setup),
    );
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
      if (this.selectedSortOption === 'score') {
        const scoreSort = right.score - left.score;
        if (scoreSort !== 0) return scoreSort;
      } else if (this.selectedSortOption === 'newest') {
        const leftTime = Date.parse(left.createdAt);
        const rightTime = Date.parse(right.createdAt);
        if (leftTime !== rightTime) {
          return rightTime - leftTime;
        }
      }
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

  private matchesLibraryFilter(setup: SetupItem): boolean {
    if (this.setupLibraryView === 'all') {
      return true;
    }
    if (this.setupLibraryView === 'favorites') {
      return this.favoriteSetupIds.has(setup.id);
    }
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return false;
    }
    return setup.userId === currentUser.id;
  }

  private loadFavoriteSetupIdsFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.favoritesStorageKey);
      if (!raw) {
        this.favoriteSetupIds = new Set<number>();
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        this.favoriteSetupIds = new Set<number>();
        return;
      }
      const nextIds = parsed.filter((item) => typeof item === 'number') as number[];
      this.favoriteSetupIds = new Set<number>(nextIds);
    } catch {
      this.favoriteSetupIds = new Set<number>();
    }
  }

  private persistFavoriteSetupIds(): void {
    localStorage.setItem(this.favoritesStorageKey, JSON.stringify([...this.favoriteSetupIds]));
  }

  private loadSetupCommentsFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.commentsStorageKey);
      if (!raw) {
        this.setupComments = [];
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        this.setupComments = [];
        return;
      }
      this.setupComments = parsed
        .filter(
          (item): item is SetupLocalComment =>
            typeof item === 'object' &&
            item !== null &&
            typeof (item as SetupLocalComment).id === 'number' &&
            typeof (item as SetupLocalComment).setupId === 'number' &&
            typeof (item as SetupLocalComment).author === 'string' &&
            typeof (item as SetupLocalComment).text === 'string' &&
            typeof (item as SetupLocalComment).createdAt === 'string',
        )
        .map((item) => ({
          id: item.id,
          setupId: item.setupId,
          author: item.author,
          text: item.text,
          createdAt: item.createdAt,
        }));
    } catch {
      this.setupComments = [];
    }
  }

  private persistSetupComments(): void {
    localStorage.setItem(this.commentsStorageKey, JSON.stringify(this.setupComments));
  }

  private normalizeGroupValue(value: string | null | undefined, fallback: string): string {
    const normalized = (value ?? '').trim();
    return normalized.length > 0 ? normalized : fallback;
  }

  private compareText(left: string | null | undefined, right: string | null | undefined): number {
    return (left ?? '').localeCompare(right ?? '', undefined, {sensitivity: 'base'});
  }

  private loadFilterPresetsFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.filterPresetsStorageKey);
      if (!raw) {
        this.filterPresets = [];
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        this.filterPresets = [];
        return;
      }
      this.filterPresets = parsed
        .filter(
          (item): item is SetupFilterPreset =>
            typeof item === 'object' &&
            item !== null &&
            typeof (item as SetupFilterPreset).id === 'string' &&
            typeof (item as SetupFilterPreset).name === 'string' &&
            Array.isArray((item as SetupFilterPreset).gameFilters) &&
            Array.isArray((item as SetupFilterPreset).trackFilters) &&
            Array.isArray((item as SetupFilterPreset).sessionFilters) &&
            Array.isArray((item as SetupFilterPreset).weatherFilters) &&
            Array.isArray((item as SetupFilterPreset).inputFilters) &&
            typeof (item as SetupFilterPreset).query === 'string' &&
            ['all', 'mine', 'favorites'].includes((item as SetupFilterPreset).libraryView) &&
            ['title', 'score', 'newest'].includes((item as SetupFilterPreset).sortOption),
        )
        .slice(0, 12);
    } catch {
      this.filterPresets = [];
    }
  }

  private persistFilterPresets(): void {
    localStorage.setItem(this.filterPresetsStorageKey, JSON.stringify(this.filterPresets));
  }

  private recordRecentSetup(setup: SetupItem): void {
    try {
      const raw = localStorage.getItem(this.recentSetupsStorageKey);
      const current = raw ? (JSON.parse(raw) as Array<Record<string, unknown>>) : [];
      const nextEntry = {
        id: setup.id,
        title: setup.title,
        gameCode: setup.gameCode,
        trackSlug: setup.trackSlug,
        openedAt: new Date().toISOString(),
      };
      const next = [nextEntry, ...current.filter((item) => Number(item['id']) !== setup.id)].slice(
        0,
        10,
      );
      localStorage.setItem(this.recentSetupsStorageKey, JSON.stringify(next));
    } catch {
      // Ignore localStorage failures.
    }
  }
}

type SetupTreeRow =
  | {type: 'group'; level: 0 | 1 | 2 | 3; key: string; label: string; count: number}
  | {type: 'setup'; level: 4; key: string; setup: SetupItem};
