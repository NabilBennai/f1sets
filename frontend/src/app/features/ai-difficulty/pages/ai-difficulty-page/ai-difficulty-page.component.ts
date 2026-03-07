import {HttpErrorResponse} from '@angular/common/http';
import {UpperCasePipe} from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Chart} from 'chart.js/auto';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
import {Subscription} from 'rxjs';
import {TrackDiscoveryService} from '../../../discovery/data-access/track-discovery.service';
import {TrackListItem} from '../../../discovery/models/track.models';
import {SetupService} from '../../../setups/data-access/setup.service';
import {
  AiDifficultyCalculationResponse,
  AiDifficultyCurve,
} from '../../../setups/models/setup.models';

type AiDifficultyForm = FormGroup<{
  gameCode: FormControl<string>;
  trackSlug: FormControl<string>;
  lapTime: FormControl<string>;
}>;

interface GameOption {
  code: string;
  label: string;
}

interface ScatterPoint {
  x: number;
  y: number;
}

@Component({
  selector: 'app-ai-difficulty-page',
  templateUrl: './ai-difficulty-page.component.html',
  styleUrl: './ai-difficulty-page.component.scss',
  imports: [ReactiveFormsModule, UpperCasePipe, TranslateModule],
})
export class AiDifficultyPageComponent implements OnInit, AfterViewInit, OnDestroy {
  private static readonly CURVE_SAMPLE_COUNT = 80;
  private static readonly TARGET_INTERVAL_AI = 3;
  private static readonly COMFORT_INTERVAL_AI = 6;

  @ViewChild('curveCanvas') private curveCanvas?: ElementRef<HTMLCanvasElement>;

  readonly form: AiDifficultyForm = new FormGroup({
    gameCode: new FormControl('f12025', {nonNullable: true, validators: [Validators.required]}),
    trackSlug: new FormControl('', {nonNullable: true, validators: [Validators.required]}),
    lapTime: new FormControl('1:30.000', {nonNullable: true, validators: [Validators.required]}),
  });

  readonly gameOptions: readonly GameOption[] = [
    {code: 'f12025', label: 'EA SPORTS F1 25'},
    {code: 'f12024', label: 'EA SPORTS F1 24'},
    {code: 'f12023', label: 'EA SPORTS F1 23'},
  ];

  tracks: TrackListItem[] = [];
  tracksLoading = false;
  curveLoading = false;
  calculating = false;
  errorMessage = '';
  curve: AiDifficultyCurve | null = null;
  calculation: AiDifficultyCalculationResponse | null = null;
  lastLapTimeMs: number | null = null;

  private curveChart: Chart<'scatter'> | null = null;
  private confidenceChart: Chart<'bar'> | null = null;
  private viewInitialized = false;
  private langChangeSubscription?: Subscription;

  constructor(
    private readonly trackDiscoveryService: TrackDiscoveryService,
    private readonly setupService: SetupService,
    private readonly translateService: TranslateService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadTracksForGame(this.form.controls.gameCode.getRawValue());
    this.langChangeSubscription = this.translateService.onLangChange.subscribe(() => {
      this.renderCurveChart();
      this.renderConfidenceChart();
      this.cdr.markForCheck();
    });
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    this.renderCurveChart();
    this.renderConfidenceChart();
  }

  ngOnDestroy(): void {
    this.langChangeSubscription?.unsubscribe();
    this.destroyCurveChart();
    this.destroyConfidenceChart();
  }

  onGameChange(): void {
    this.form.controls.trackSlug.setValue('', {emitEvent: false});
    this.curve = null;
    this.calculation = null;
    this.lastLapTimeMs = null;
    this.errorMessage = '';
    this.destroyCurveChart();
    this.destroyConfidenceChart();
    this.loadTracksForGame(this.form.controls.gameCode.getRawValue());
  }

  onTrackChange(): void {
    this.calculation = null;
    this.lastLapTimeMs = null;
    this.errorMessage = '';
    this.destroyConfidenceChart();
    this.loadCurve();
  }

  calculate(): void {
    if (this.calculating || !this.curve) {
      return;
    }

    const lapTimeText = this.form.controls.lapTime.getRawValue();
    const lapTimeMs = this.parseLapTimeToMs(lapTimeText);
    if (lapTimeMs === null) {
      this.errorMessage = this.translateService.instant('aiDifficulty.messages.invalidLapTime');
      this.calculation = null;
      this.lastLapTimeMs = null;
      this.renderCurveChart();
      return;
    }

    this.calculating = true;
    this.errorMessage = '';
    this.setupService
      .calculateAiDifficulty(
        this.form.controls.gameCode.getRawValue(),
        this.form.controls.trackSlug.getRawValue(),
        {lapTimeMs},
      )
      .subscribe({
        next: (response) => {
          this.calculating = false;
          this.calculation = response;
          this.lastLapTimeMs = lapTimeMs;
          this.cdr.detectChanges();
          this.renderCurveChart();
          this.renderConfidenceChart();
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.calculating = false;
          this.calculation = null;
          this.lastLapTimeMs = null;
          this.errorMessage = this.resolveErrorMessage(error);
          this.destroyConfidenceChart();
          this.renderCurveChart();
          this.cdr.markForCheck();
        },
      });
  }

  get selectedTrackLabel(): string {
    const selectedSlug = this.form.controls.trackSlug.getRawValue();
    const selectedTrack = this.tracks.find((track) => track.slug === selectedSlug);
    const fallback = selectedSlug ? selectedSlug.toUpperCase() : '';
    const resolved = selectedTrack?.grandPrixName ?? fallback;
    return resolved || this.translateService.instant('common.notAvailable');
  }

  get calculatedLapTimeDisplay(): string {
    if (this.lastLapTimeMs === null) {
      return '-';
    }
    const minutes = Math.floor(this.lastLapTimeMs / 60_000);
    const remainingMs = this.lastLapTimeMs % 60_000;
    const seconds = Math.floor(remainingMs / 1000);
    const milliseconds = remainingMs % 1000;
    return `${minutes}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
  }

  applyReferenceLapTime(reference: 'esports' | 'average'): void {
    if (!this.curve) {
      return;
    }

    const selectedReferenceMs =
      reference === 'esports' ? this.curve.esportsRefTimeMs : this.curve.avgRefTimeMs;
    if (selectedReferenceMs === null) {
      return;
    }

    this.form.controls.lapTime.setValue(this.formatLapTimeMs(selectedReferenceMs), {
      emitEvent: false,
    });
  }

  private loadTracksForGame(gameCode: string): void {
    this.tracksLoading = true;
    this.trackDiscoveryService.getTracks(gameCode, {size: 100, page: 0, sort: 'name'}).subscribe({
      next: (response) => {
        const aiTracks = response.tracks.filter((track) => track.hasAiDifficulty);
        this.tracks = aiTracks.length > 0 ? aiTracks : response.tracks;

        const currentTrack = this.form.controls.trackSlug.getRawValue();
        const fallbackTrack = this.tracks[0]?.slug ?? '';
        const nextTrack =
          this.tracks.find((track) => track.slug === currentTrack)?.slug ?? fallbackTrack;
        this.form.controls.trackSlug.setValue(nextTrack, {emitEvent: false});
        this.tracksLoading = false;

        if (nextTrack) {
          this.loadCurve();
        } else {
          this.curve = null;
          this.destroyCurveChart();
          this.destroyConfidenceChart();
          this.cdr.markForCheck();
        }
      },
      error: (error) => {
        this.tracksLoading = false;
        this.tracks = [];
        this.curve = null;
        this.errorMessage = this.resolveErrorMessage(error);
        this.destroyCurveChart();
        this.destroyConfidenceChart();
        this.cdr.markForCheck();
      },
    });
  }

  private loadCurve(): void {
    const gameCode = this.form.controls.gameCode.getRawValue();
    const trackSlug = this.form.controls.trackSlug.getRawValue();
    if (!gameCode || !trackSlug) {
      this.curve = null;
      this.destroyCurveChart();
      this.destroyConfidenceChart();
      return;
    }

    this.curveLoading = true;
    this.errorMessage = '';
    this.setupService.getAiDifficultyCurve(gameCode, trackSlug).subscribe({
      next: (curve) => {
        this.curveLoading = false;
        this.curve = curve;
        this.calculation = null;
        this.lastLapTimeMs = null;
        this.destroyConfidenceChart();
        this.renderCurveChart();
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.curveLoading = false;
        this.curve = null;
        this.calculation = null;
        this.lastLapTimeMs = null;
        this.errorMessage = this.resolveErrorMessage(error);
        this.destroyCurveChart();
        this.destroyConfidenceChart();
        this.cdr.markForCheck();
      },
    });
  }

  private renderCurveChart(): void {
    if (!this.viewInitialized || !this.curve || !this.curveCanvas) {
      this.destroyCurveChart();
      return;
    }

    const linePoints = this.buildCurvePoints();
    const targetBand = this.buildIntervalBand(
      linePoints,
      AiDifficultyPageComponent.TARGET_INTERVAL_AI,
    );
    const comfortBand = this.buildIntervalBand(
      linePoints,
      AiDifficultyPageComponent.COMFORT_INTERVAL_AI,
    );
    const esportsPoint = this.buildReferencePoint(this.curve.esportsRefTimeMs);
    const avgPoint = this.buildReferencePoint(this.curve.avgRefTimeMs);
    const esportsPaceLine = this.buildVerticalLine(this.curve.esportsRefTimeMs);
    const averagePaceLine = this.buildVerticalLine(this.curve.avgRefTimeMs);
    const confidenceIntervalLine = this.buildConfidenceIntervalLine();
    const confidenceMinPoint = this.buildCalculatedConfidencePoint('min');
    const confidenceMaxPoint = this.buildCalculatedConfidencePoint('max');
    const computedPoint =
      this.calculation && this.lastLapTimeMs
        ? ({
            x: this.lastLapTimeMs / 1000,
            y: this.clampDifficulty(this.calculation.difficulty),
          } as ScatterPoint)
        : null;
    const xMin = linePoints[0]?.x;
    const xMax = linePoints[linePoints.length - 1]?.x;

    this.destroyCurveChart();
    this.curveChart = new Chart(this.curveCanvas.nativeElement, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: '__internal.comfortLower',
            data: comfortBand.lower,
            showLine: true,
            borderWidth: 0,
            pointRadius: 0,
          },
          {
            label: this.translateService.instant('aiDifficulty.chart.comfortInterval'),
            data: comfortBand.upper,
            showLine: true,
            borderWidth: 0,
            pointRadius: 0,
            backgroundColor: 'rgba(15, 118, 110, 0.08)',
            fill: '-1',
          },
          {
            label: '__internal.targetLower',
            data: targetBand.lower,
            showLine: true,
            borderWidth: 0,
            pointRadius: 0,
          },
          {
            label: this.translateService.instant('aiDifficulty.chart.targetInterval'),
            data: targetBand.upper,
            showLine: true,
            borderWidth: 0,
            pointRadius: 0,
            backgroundColor: 'rgba(15, 118, 110, 0.16)',
            fill: '-1',
          },
          {
            label: this.translateService.instant('aiDifficulty.chart.difficultyCurve'),
            data: linePoints,
            showLine: true,
            borderColor: '#0f766e',
            borderWidth: 2.5,
            pointRadius: 0,
            tension: 0.12,
          },
          {
            label: this.translateService.instant('aiDifficulty.chart.esportsPaceLine'),
            data: esportsPaceLine,
            showLine: true,
            borderColor: 'rgba(37, 99, 235, 0.75)',
            borderDash: [6, 4],
            borderWidth: 1.5,
            pointRadius: 0,
          },
          {
            label: this.translateService.instant('aiDifficulty.chart.averagePaceLine'),
            data: averagePaceLine,
            showLine: true,
            borderColor: 'rgba(147, 51, 234, 0.7)',
            borderDash: [6, 4],
            borderWidth: 1.5,
            pointRadius: 0,
          },
          {
            label: this.translateService.instant('aiDifficulty.chart.confidenceInterval'),
            data: confidenceIntervalLine,
            showLine: true,
            borderColor: 'rgba(220, 38, 38, 0.75)',
            borderDash: [4, 3],
            borderWidth: 1.75,
            pointRadius: 0,
          },
          {
            label: this.translateService.instant('aiDifficulty.chart.esportsReference'),
            data: esportsPoint ? [esportsPoint] : [],
            backgroundColor: '#2563eb',
            pointRadius: 6,
          },
          {
            label: this.translateService.instant('aiDifficulty.chart.averageReference'),
            data: avgPoint ? [avgPoint] : [],
            backgroundColor: '#9333ea',
            pointRadius: 6,
          },
          {
            label: this.translateService.instant('aiDifficulty.chart.yourPoint'),
            data: computedPoint ? [computedPoint] : [],
            backgroundColor: '#dc2626',
            pointRadius: 7,
            pointHoverRadius: 8,
          },
          {
            label: '__internal.confidenceMin',
            data: confidenceMinPoint ? [confidenceMinPoint] : [],
            backgroundColor: '#b91c1c',
            borderColor: '#fff',
            borderWidth: 1,
            pointRadius: 4,
          },
          {
            label: '__internal.confidenceMax',
            data: confidenceMaxPoint ? [confidenceMaxPoint] : [],
            backgroundColor: '#b91c1c',
            borderColor: '#fff',
            borderWidth: 1,
            pointRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'nearest',
          intersect: false,
        },
        scales: {
          x: {
            title: {display: true, text: this.translateService.instant('aiDifficulty.chart.xAxis')},
            min: xMin,
            max: xMax,
            ticks: {
              callback: (value) => {
                const seconds = typeof value === 'number' ? value : Number(value);
                return Number.isFinite(seconds) ? this.formatLapTimeFromSeconds(seconds) : '';
              },
            },
          },
          y: {
            title: {display: true, text: this.translateService.instant('aiDifficulty.chart.yAxis')},
            min: 0,
            max: 110,
            ticks: {
              stepSize: 10,
            },
            grid: {
              color: 'rgba(148, 163, 184, 0.25)',
            },
          },
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              filter: (item) => !item.text.startsWith('__internal.'),
              boxWidth: 14,
            },
          },
          tooltip: {
            filter: (context) => {
              const label = context.dataset.label ?? '';
              return !label.startsWith('__internal.');
            },
            callbacks: {
              label: (context) => {
                const x = context.parsed.x ?? 0;
                const y = context.parsed.y ?? 0;
                return this.translateService.instant('aiDifficulty.chart.tooltip', {
                  label: context.dataset.label ?? '',
                  x: this.formatLapTimeFromSeconds(x),
                  y: y.toFixed(1),
                });
              },
            },
          },
        },
      },
    });
  }

  private renderConfidenceChart(): void {
    if (!this.viewInitialized || !this.calculation) {
      this.destroyConfidenceChart();
      return;
    }
  }

  private buildCurvePoints(): ScatterPoint[] {
    if (!this.curve) {
      return [];
    }

    const upperDifficultySec = this.computeTimeForDifficulty(110);
    const zeroDifficultySec = this.computeTimeForDifficulty(0);
    const fallbackMin = 45;
    const fallbackMax = 120;

    const minSec = upperDifficultySec !== null ? Math.max(0, upperDifficultySec) : fallbackMin;
    const maxSec =
      zeroDifficultySec !== null
        ? Math.max(minSec + 1, zeroDifficultySec)
        : Math.max(minSec + 1, fallbackMax);
    const step = (maxSec - minSec) / AiDifficultyPageComponent.CURVE_SAMPLE_COUNT;

    const points: ScatterPoint[] = [];
    for (let i = 0; i <= AiDifficultyPageComponent.CURVE_SAMPLE_COUNT; i += 1) {
      const x = minSec + step * i;
      points.push({x, y: this.clampDifficulty(this.computeDifficulty(x))});
    }
    return points;
  }

  private buildReferencePoint(timeMs: number | null): ScatterPoint | null {
    if (!timeMs) {
      return null;
    }
    const seconds = timeMs / 1000;
    return {
      x: seconds,
      y: this.clampDifficulty(this.computeDifficulty(seconds)),
    };
  }

  private buildVerticalLine(timeMs: number | null): ScatterPoint[] {
    if (!timeMs) {
      return [];
    }
    const x = timeMs / 1000;
    return [
      {x, y: 0},
      {x, y: 110},
    ];
  }

  private buildConfidenceIntervalLine(): ScatterPoint[] {
    if (!this.calculation || this.lastLapTimeMs === null) {
      return [];
    }
    const x = this.lastLapTimeMs / 1000;
    const min = this.clampDifficulty(this.calculation.confidence.min);
    const max = this.clampDifficulty(this.calculation.confidence.max);
    const lower = Math.min(min, max);
    const upper = Math.max(min, max);
    return [
      {x, y: lower},
      {x, y: upper},
    ];
  }

  private buildCalculatedConfidencePoint(kind: 'min' | 'max'): ScatterPoint | null {
    if (!this.calculation || this.lastLapTimeMs === null) {
      return null;
    }
    const x = this.lastLapTimeMs / 1000;
    const y =
      kind === 'min'
        ? this.clampDifficulty(this.calculation.confidence.min)
        : this.clampDifficulty(this.calculation.confidence.max);
    return {x, y};
  }

  private buildIntervalBand(
    points: ScatterPoint[],
    deltaDifficulty: number,
  ): {upper: ScatterPoint[]; lower: ScatterPoint[]} {
    return {
      upper: points.map((point) => ({
        x: point.x,
        y: this.clampDifficulty(point.y + deltaDifficulty),
      })),
      lower: points.map((point) => ({
        x: point.x,
        y: this.clampDifficulty(point.y - deltaDifficulty),
      })),
    };
  }

  private computeDifficulty(timeSeconds: number): number {
    if (!this.curve) {
      return 0;
    }
    return this.curve.slope * timeSeconds + this.curve.intercept;
  }

  private computeTimeForDifficulty(targetDifficulty: number): number | null {
    if (!this.curve || this.curve.slope === 0) {
      return null;
    }

    const timeSeconds = (targetDifficulty - this.curve.intercept) / this.curve.slope;
    if (!Number.isFinite(timeSeconds) || timeSeconds < 0) {
      return null;
    }
    return timeSeconds;
  }

  private clampDifficulty(value: number): number {
    return Math.max(0, Math.min(110, value));
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

  formatLapTimeMs(ms: number): string {
    return this.formatLapTimeFromSeconds(ms / 1000);
  }

  private formatLapTimeFromSeconds(seconds: number): string {
    const totalMilliseconds = Math.max(0, Math.round(seconds * 1000));
    const minutes = Math.floor(totalMilliseconds / 60_000);
    const remainingMs = totalMilliseconds % 60_000;
    const wholeSeconds = Math.floor(remainingMs / 1000);
    const milliseconds = remainingMs % 1000;
    return `${minutes}:${String(wholeSeconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
  }

  private destroyCurveChart(): void {
    this.curveChart?.destroy();
    this.curveChart = null;
  }

  private destroyConfidenceChart(): void {
    this.confidenceChart?.destroy();
    this.confidenceChart = null;
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
