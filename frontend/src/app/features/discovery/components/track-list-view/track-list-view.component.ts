import {HttpErrorResponse} from '@angular/common/http';
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {
  catchError,
  combineLatest,
  distinctUntilChanged,
  map,
  merge,
  Observable,
  of,
  startWith,
  Subject,
  switchMap,
  withLatestFrom,
} from 'rxjs';
import {TrackDiscoveryService} from '../../data-access/track-discovery.service';
import {TrackFeature, TrackListItem} from '../../models/track.models';
import {
  applyFilters,
  DiscoveryFilters,
  hasActiveFilters,
  normalizeFilters,
  toTrackCard,
  TrackCardView,
  TrackViewState,
} from './track-list-view.presenter';
import {RouterLink} from '@angular/router';
import {AsyncPipe, UpperCasePipe} from '@angular/common';
import {ErpPaginationComponent} from '../../../../shared/components/erp-pagination/erp-pagination.component';
import {
  MultiAutocompleteFilterComponent,
  MultiFilterOption,
} from '../../../../shared/components/multi-autocomplete-filter/multi-autocomplete-filter.component';

interface FeatureToggleDefinition {
  key: TrackFeature;
  label: string;
}

interface TrackListViewModel {
  status: TrackViewState;
  gameLabel: string;
  totalTracks: number;
  filteredCount: number;
  page: number;
  totalPages: number;
  tracks: TrackCardView[];
  errorMessage?: string;
}

type TrackSort = 'name' | 'length_asc' | 'length_desc' | 'slug';

type FiltersFormGroup = FormGroup<{
  query: FormControl<string>;
}>;

@Component({
  selector: 'app-track-list-view',
  templateUrl: './track-list-view.component.html',
  styleUrl: './track-list-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AsyncPipe,
    UpperCasePipe,
    ErpPaginationComponent,
    MultiAutocompleteFilterComponent,
  ],
})
export class TrackListViewComponent {
  readonly gameOptions = [
    {code: 'f12025', label: 'EA SPORTS F1 25'},
    {code: 'f12024', label: 'EA SPORTS F1 24'},
    {code: 'f12023', label: 'EA SPORTS F1 23'},
  ];

  readonly featureToggles: FeatureToggleDefinition[] = [
    {key: 'setups', label: 'Setups'},
    {key: 'leaderboard', label: 'Leaderboard'},
    {key: 'ai', label: 'AI Curve'},
  ];
  readonly featureFilterOptions: MultiFilterOption[] = this.featureToggles.map((toggle) => ({
    value: toggle.key,
    label: toggle.label,
  }));

  readonly gameControl: FormControl<string>;
  readonly sortControl: FormControl<TrackSort>;
  readonly pageSize = 24;
  readonly filtersForm: FiltersFormGroup;
  selectedFeatureFilters: string[] = [];
  readonly filtersActive$: Observable<boolean>;
  readonly viewModel$: Observable<TrackListViewModel>;
  private readonly selectedGame$: Observable<string>;
  private readonly filters$: Observable<DiscoveryFilters>;
  private readonly selectedSort$: Observable<string>;
  private readonly selectedFeatures$ = new Subject<string[]>();
  private readonly page$ = new Subject<number>();
  private currentPage = 0;
  private readonly refreshTrigger$ = new Subject<{forceRefresh: boolean}>();
  private readonly fetchRequests$: Observable<{
    gameCode: string;
    filters: DiscoveryFilters;
    sort: string;
    page: number;
    forceRefresh: boolean;
  }>;
  private readonly tracksState$: Observable<{
    status: TrackViewState;
    gameCode: string;
    tracks: TrackListItem[];
    page: number;
    totalPages: number;
    totalTracks: number;
    errorMessage?: string;
  }>;

  constructor(private readonly trackDiscoveryService: TrackDiscoveryService) {
    this.gameControl = new FormControl(this.gameOptions[0].code, {nonNullable: true});
    this.sortControl = new FormControl<TrackSort>('name', {nonNullable: true});
    this.filtersForm = new FormGroup({
      query: new FormControl('', {nonNullable: true}),
    });

    this.selectedGame$ = this.gameControl.valueChanges.pipe(
      startWith(this.gameControl.value),
      map((code) => (code ?? this.gameOptions[0].code).toLowerCase()),
      distinctUntilChanged(),
    );

    this.filters$ = combineLatest([
      this.filtersForm.valueChanges.pipe(startWith(this.filtersForm.getRawValue())),
      this.selectedFeatures$.pipe(startWith(this.selectedFeatureFilters)),
    ]).pipe(
      map(([value, selectedFeatures]) =>
        normalizeFilters({
          query: value.query,
          setups: selectedFeatures.includes('setups'),
          leaderboard: selectedFeatures.includes('leaderboard'),
          ai: selectedFeatures.includes('ai'),
        }),
      ),
    );
    this.selectedSort$ = this.sortControl.valueChanges.pipe(
      startWith(this.sortControl.value),
      map((value) => value ?? 'name'),
      distinctUntilChanged(),
    );

    this.filtersActive$ = this.filters$.pipe(map(hasActiveFilters), distinctUntilChanged());

    this.fetchRequests$ = merge(
      combineLatest([this.selectedGame$, this.filters$, this.selectedSort$]).pipe(
        map(([gameCode, filters, sort]) => ({
          gameCode,
          filters,
          sort,
          page: 0,
          forceRefresh: false,
        })),
      ),
      this.page$.pipe(
        withLatestFrom(this.selectedGame$, this.filters$, this.selectedSort$),
        map(([page, gameCode, filters, sort]) => ({
          gameCode,
          filters,
          sort,
          page,
          forceRefresh: false,
        })),
      ),
      this.refreshTrigger$.pipe(
        withLatestFrom(this.selectedGame$, this.filters$, this.selectedSort$),
        map(([options, gameCode, filters, sort]) => ({
          gameCode,
          filters,
          sort,
          page: this.currentPage,
          forceRefresh: options.forceRefresh,
        })),
      ),
    );

    this.tracksState$ = this.fetchRequests$.pipe(
      switchMap(({gameCode, filters, sort, page, forceRefresh}) => {
        this.currentPage = page;
        return this.trackDiscoveryService
          .getTracks(gameCode, {
            forceRefresh,
            query: filters.query,
            hasSetups: filters.features.setups,
            hasLeaderboard: filters.features.leaderboard,
            hasAiDifficulty: filters.features.ai,
            sort: sort as 'name' | 'length_asc' | 'length_desc' | 'slug',
            page,
            size: this.pageSize,
          })
          .pipe(
            map((response) => ({
              status: 'ready' as const,
              gameCode: response.gameCode.toLowerCase(),
              tracks: response.tracks,
              page: response.page ?? 0,
              totalPages: response.totalPages ?? 0,
              totalTracks: response.totalTracks ?? response.tracks.length,
            })),
            startWith({
              status: 'loading' as const,
              gameCode,
              tracks: [] as TrackListItem[],
              page,
              totalPages: 0,
              totalTracks: 0,
            }),
            catchError((error) =>
              of({
                status: 'error' as const,
                gameCode,
                tracks: [] as TrackListItem[],
                page,
                totalPages: 0,
                totalTracks: 0,
                errorMessage: this.resolveErrorMessage(error),
              }),
            ),
          );
      }),
    );

    this.viewModel$ = combineLatest([this.tracksState$, this.filters$]).pipe(
      map(([state, filters]) => {
        if (state.status === 'loading') {
          return {
            status: 'loading',
            gameLabel: this.getGameLabel(state.gameCode),
            totalTracks: 0,
            filteredCount: 0,
            page: state.page,
            totalPages: state.totalPages,
            tracks: [],
          } satisfies TrackListViewModel;
        }

        if (state.status === 'error') {
          return {
            status: 'error',
            gameLabel: this.getGameLabel(state.gameCode),
            totalTracks: 0,
            filteredCount: 0,
            page: state.page,
            totalPages: state.totalPages,
            tracks: [],
            errorMessage: state.errorMessage,
          } satisfies TrackListViewModel;
        }

        const filteredTracks = applyFilters(state.tracks, filters);

        return {
          status: filteredTracks.length === 0 ? 'empty' : 'ready',
          gameLabel: this.getGameLabel(state.gameCode),
          totalTracks: state.totalTracks,
          filteredCount: filteredTracks.length,
          page: state.page,
          totalPages: state.totalPages,
          tracks: filteredTracks.map(toTrackCard),
        } satisfies TrackListViewModel;
      }),
    );
  }

  handleRefresh(): void {
    this.trackDiscoveryService.clearCache();
    this.refreshTrigger$.next({forceRefresh: true});
  }

  goToPage(page: number): void {
    if (page < 0 || page === this.currentPage) {
      return;
    }
    this.page$.next(page);
  }

  handleClearFilters(): void {
    this.filtersForm.reset({
      query: '',
    });
    this.selectedFeatureFilters = [];
    this.selectedFeatures$.next(this.selectedFeatureFilters);
    this.sortControl.setValue('name');
  }

  onFeatureFiltersChange(values: string[]): void {
    this.selectedFeatureFilters = [...values];
    this.selectedFeatures$.next(this.selectedFeatureFilters);
  }

  setNameSort(): void {
    this.sortControl.setValue('name');
  }

  setSlugSort(): void {
    this.sortControl.setValue('slug');
  }

  toggleLengthSort(): void {
    this.sortControl.setValue(
      this.sortControl.value === 'length_asc' ? 'length_desc' : 'length_asc',
    );
  }

  sortMark(column: 'name' | 'slug' | 'length'): string {
    if (column === 'name') {
      return this.sortControl.value === 'name' ? 'ASC' : '';
    }
    if (column === 'slug') {
      return this.sortControl.value === 'slug' ? 'ASC' : '';
    }
    if (this.sortControl.value === 'length_asc') {
      return 'ASC';
    }
    if (this.sortControl.value === 'length_desc') {
      return 'DESC';
    }
    return '';
  }

  trackByTrackId(_: number, track: TrackCardView): number {
    return track.id;
  }

  private getGameLabel(gameCode: string): string {
    const normalized = gameCode.toLowerCase();
    return (
      this.gameOptions.find((option) => option.code === normalized)?.label ??
      normalized.toUpperCase()
    );
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 404) {
        return 'Tracks were not found for this game. Try another title or refresh.';
      }
      return error.error?.message ?? `Discovery API unavailable (status ${error.status}).`;
    }

    if (typeof error === 'string') {
      return error;
    }

    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string'
    ) {
      return error.message;
    }

    return 'The discovery catalog is unavailable right now. Please retry in a moment.';
  }
}
