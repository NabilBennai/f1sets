import {HttpErrorResponse} from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
import {debounceTime, Subject, takeUntil} from 'rxjs';
import {ToastService} from '../../../../core/toast/toast.service';
import {AdminTrackService} from '../../data-access/admin-track.service';
import {AdminTrack} from '../../models/admin-track.models';
import {
  MultiAutocompleteFilterComponent,
  MultiFilterOption,
} from '../../../../shared/components/multi-autocomplete-filter/multi-autocomplete-filter.component';

type TrackFormGroup = FormGroup<{
  slug: FormControl<string>;
  grandPrixName: FormControl<string>;
  circuitName: FormControl<string>;
  lengthKm: FormControl<string>;
}>;

type TrackFilterForm = FormGroup<{
  query: FormControl<string>;
}>;

type SortColumn = 'slug' | 'grandPrixName' | 'circuitName' | 'lengthKm' | 'hasImage';

@Component({
  selector: 'app-admin-track-page',
  templateUrl: './admin-track-page.component.html',
  styleUrl: './admin-track-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslateModule, MultiAutocompleteFilterComponent],
})
export class AdminTrackPageComponent implements OnInit, OnDestroy {
  readonly gameOptions = [
    {code: 'f12025', label: 'EA SPORTS F1 25'},
    {code: 'f12024', label: 'EA SPORTS F1 24'},
    {code: 'f12023', label: 'EA SPORTS F1 23'},
  ];

  readonly gameControl = new FormControl(this.gameOptions[0].code, {nonNullable: true});
  readonly filters: TrackFilterForm = new FormGroup({
    query: new FormControl('', {nonNullable: true}),
  });
  readonly hasImageFilterOptions: MultiFilterOption[] = [
    {value: 'yes', label: 'adminTrack.filters.hasImageYes'},
    {value: 'no', label: 'adminTrack.filters.hasImageNo'},
  ];
  selectedHasImageFilters: string[] = [];

  readonly createForm: TrackFormGroup = new FormGroup({
    slug: new FormControl('', {nonNullable: true}),
    grandPrixName: new FormControl('', {nonNullable: true}),
    circuitName: new FormControl('', {nonNullable: true}),
    lengthKm: new FormControl('', {nonNullable: true}),
  });

  readonly editForm: TrackFormGroup = new FormGroup({
    slug: new FormControl('', {nonNullable: true}),
    grandPrixName: new FormControl('', {nonNullable: true}),
    circuitName: new FormControl('', {nonNullable: true}),
    lengthKm: new FormControl('', {nonNullable: true}),
  });

  tracks: AdminTrack[] = [];
  visibleTracks: AdminTrack[] = [];

  sortBy: SortColumn = 'slug';
  sortDirection: 'ASC' | 'DESC' = 'ASC';

  loading = false;
  creating = false;
  saving = false;
  uploading = false;
  deleting = false;

  createModalOpen = false;
  editModalOpen = false;
  editTrackId: number | null = null;
  selectedFile: File | null = null;

  errorMessage = '';
  successMessage = '';

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly adminTrackService: AdminTrackService,
    private readonly toastService: ToastService,
    private readonly translateService: TranslateService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  get editingTrack(): AdminTrack | null {
    if (this.editTrackId === null) {
      return null;
    }
    return this.tracks.find((track) => track.id === this.editTrackId) ?? null;
  }

  ngOnInit(): void {
    this.loadTracks();

    this.gameControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadTracks();
    });

    this.filters.valueChanges
      .pipe(debounceTime(200), takeUntil(this.destroy$))
      .subscribe(() => this.refreshVisibleTracks());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onHasImageFiltersChange(values: string[]): void {
    this.selectedHasImageFilters = [...values];
    this.refreshVisibleTracks();
  }

  setSort(column: SortColumn): void {
    if (this.sortBy === column) {
      this.sortDirection = this.sortDirection === 'ASC' ? 'DESC' : 'ASC';
    } else {
      this.sortBy = column;
      this.sortDirection = 'ASC';
    }
    this.refreshVisibleTracks();
  }

  sortMark(column: SortColumn): string {
    if (this.sortBy !== column) {
      return '';
    }
    return this.sortDirection;
  }

  openCreateModal(): void {
    this.createForm.reset({slug: '', grandPrixName: '', circuitName: '', lengthKm: ''});
    this.errorMessage = '';
    this.successMessage = '';
    this.createModalOpen = true;
    this.cdr.markForCheck();
  }

  closeCreateModal(): void {
    this.createModalOpen = false;
  }

  openEditModal(track: AdminTrack): void {
    this.editTrackId = track.id;
    this.selectedFile = null;
    this.editForm.setValue({
      slug: track.slug ?? '',
      grandPrixName: track.grandPrixName ?? '',
      circuitName: track.circuitName ?? '',
      lengthKm:
        track.lengthKm === null || track.lengthKm === undefined ? '' : String(track.lengthKm),
    });
    this.errorMessage = '';
    this.successMessage = '';
    this.editModalOpen = true;
    this.cdr.markForCheck();
  }

  closeEditModal(): void {
    this.editModalOpen = false;
    this.editTrackId = null;
    this.selectedFile = null;
  }

  createTrack(): void {
    if (this.creating) {
      return;
    }

    const value = this.createForm.getRawValue();
    const slug = value.slug.trim();
    if (!slug) {
      this.toastService.error(this.translateService.instant('adminTrack.messages.slugRequired'));
      return;
    }

    const parsedLength = this.parseLength(value.lengthKm);
    if (value.lengthKm.trim().length > 0 && parsedLength === null) {
      this.toastService.error(this.translateService.instant('adminTrack.messages.lengthNumeric'));
      return;
    }

    this.creating = true;
    this.adminTrackService
      .createTrack(this.gameControl.value, {
        slug,
        grandPrixName: value.grandPrixName.trim() || null,
        circuitName: value.circuitName.trim() || null,
        lengthKm: parsedLength,
      })
      .subscribe({
        next: (created) => {
          this.creating = false;
          this.tracks = [created, ...this.tracks];
          this.refreshVisibleTracks();
          this.closeCreateModal();
          this.toastService.success(this.translateService.instant('adminTrack.messages.created'));
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.creating = false;
          this.errorMessage = this.resolveErrorMessage(error);
          this.toastService.error(this.errorMessage);
          this.cdr.markForCheck();
        },
      });
  }

  saveTrack(): void {
    if (this.editTrackId === null || this.saving) {
      return;
    }

    const value = this.editForm.getRawValue();
    const slug = value.slug.trim();
    if (!slug) {
      this.toastService.error(this.translateService.instant('adminTrack.messages.slugRequired'));
      return;
    }

    const parsedLength = this.parseLength(value.lengthKm);
    if (value.lengthKm.trim().length > 0 && parsedLength === null) {
      this.toastService.error(this.translateService.instant('adminTrack.messages.lengthNumeric'));
      return;
    }

    this.saving = true;
    this.adminTrackService
      .updateTrack(this.editTrackId, {
        slug,
        grandPrixName: value.grandPrixName.trim() || null,
        circuitName: value.circuitName.trim() || null,
        lengthKm: parsedLength,
      })
      .subscribe({
        next: (updated) => {
          this.saving = false;
          this.tracks = this.tracks.map((track) => (track.id === updated.id ? updated : track));
          this.refreshVisibleTracks();
          this.toastService.success(this.translateService.instant('adminTrack.messages.updated'));
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.saving = false;
          this.errorMessage = this.resolveErrorMessage(error);
          this.toastService.error(this.errorMessage);
          this.cdr.markForCheck();
        },
      });
  }

  deleteTrack(track: AdminTrack): void {
    if (this.deleting) {
      return;
    }

    const name = track.grandPrixName ?? track.slug;
    if (
      !window.confirm(
        this.translateService.instant('adminTrack.messages.confirmDelete', {
          name,
        }),
      )
    ) {
      return;
    }

    this.deleting = true;
    this.adminTrackService.deleteTrack(track.id).subscribe({
      next: () => {
        this.deleting = false;
        this.tracks = this.tracks.filter((item) => item.id !== track.id);
        this.refreshVisibleTracks();
        if (this.editTrackId === track.id) {
          this.closeEditModal();
        }
        this.toastService.success(this.translateService.instant('adminTrack.messages.deleted'));
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.deleting = false;
        this.errorMessage = this.resolveErrorMessage(error);
        this.toastService.error(this.errorMessage);
        this.cdr.markForCheck();
      },
    });
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.selectedFile = target.files && target.files.length > 0 ? target.files[0] : null;
  }

  uploadPhoto(): void {
    if (this.editTrackId === null || !this.selectedFile || this.uploading) {
      return;
    }

    this.uploading = true;
    this.adminTrackService.uploadTrackPhoto(this.editTrackId, this.selectedFile).subscribe({
      next: (response) => {
        this.uploading = false;
        this.selectedFile = null;
        this.tracks = this.tracks.map((track) =>
          track.id === this.editTrackId
            ? {
                ...track,
                trackImageUrl: response.trackImageUrl,
              }
            : track,
        );
        this.refreshVisibleTracks();
        this.toastService.success(
          this.translateService.instant('adminTrack.messages.photoUploaded'),
        );
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.uploading = false;
        this.errorMessage = this.resolveErrorMessage(error);
        this.toastService.error(this.errorMessage);
        this.cdr.markForCheck();
      },
    });
  }

  private loadTracks(): void {
    const gameCode = this.gameControl.value;
    this.loading = true;
    this.errorMessage = '';

    this.adminTrackService.getTracks(gameCode).subscribe({
      next: (response) => {
        this.tracks = response.tracks;
        this.loading = false;
        this.refreshVisibleTracks();
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.loading = false;
        this.tracks = [];
        this.visibleTracks = [];
        this.errorMessage = this.resolveErrorMessage(error);
        this.toastService.error(this.errorMessage);
        this.cdr.markForCheck();
      },
    });
  }

  private refreshVisibleTracks(): void {
    const filter = this.filters.getRawValue();
    const query = filter.query.trim().toLowerCase();

    let data = [...this.tracks];

    if (query) {
      data = data.filter((track) =>
        [track.slug, track.grandPrixName, track.circuitName]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLowerCase().includes(query)),
      );
    }

    if (
      this.selectedHasImageFilters.includes('yes') &&
      !this.selectedHasImageFilters.includes('no')
    ) {
      data = data.filter((track) => Boolean(track.trackImageUrl));
    }
    if (
      this.selectedHasImageFilters.includes('no') &&
      !this.selectedHasImageFilters.includes('yes')
    ) {
      data = data.filter((track) => !track.trackImageUrl);
    }

    const direction = this.sortDirection === 'ASC' ? 1 : -1;
    data.sort((a, b) => direction * this.compareTracks(a, b));

    this.visibleTracks = data;
    this.cdr.markForCheck();
  }

  private compareTracks(a: AdminTrack, b: AdminTrack): number {
    switch (this.sortBy) {
      case 'lengthKm': {
        const left = a.lengthKm === null || a.lengthKm === '' ? -1 : Number(a.lengthKm);
        const right = b.lengthKm === null || b.lengthKm === '' ? -1 : Number(b.lengthKm);
        return left - right;
      }
      case 'hasImage': {
        const left = a.trackImageUrl ? 1 : 0;
        const right = b.trackImageUrl ? 1 : 0;
        return left - right;
      }
      case 'grandPrixName':
        return this.compareText(a.grandPrixName ?? a.slug, b.grandPrixName ?? b.slug);
      case 'circuitName':
        return this.compareText(a.circuitName ?? '', b.circuitName ?? '');
      case 'slug':
      default:
        return this.compareText(a.slug, b.slug);
    }
  }

  private compareText(left: string, right: string): number {
    return left.localeCompare(right, undefined, {sensitivity: 'base'});
  }

  private parseLength(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number.parseFloat(trimmed);
    return Number.isNaN(parsed) ? null : parsed;
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
}
