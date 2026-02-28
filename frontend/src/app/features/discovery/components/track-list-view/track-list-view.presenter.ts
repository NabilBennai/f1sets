import {TrackFeature, TrackListItem} from '../../models/track.models';

export type TrackViewState = 'loading' | 'ready' | 'empty' | 'error';

export interface TrackBadgeView {
  label: string;
  tone: 'success' | 'info' | 'warning' | 'accent';
}

export interface TrackCardView {
  id: number;
  title: string;
  subtitle: string;
  slug: string;
  formattedLength: string;
  trackImageUrl: string | null;
  badges: TrackBadgeView[];
}

export interface DiscoveryFilters {
  query: string;
  features: Record<TrackFeature, boolean>;
}

export function normalizeFilters(raw: {
  query?: string | null;
  setups?: boolean | null;
  leaderboard?: boolean | null;
  ai?: boolean | null;
}): DiscoveryFilters {
  return {
    query: (raw.query ?? '').trim().toLowerCase(),
    features: {
      setups: raw.setups ?? false,
      leaderboard: raw.leaderboard ?? false,
      ai: raw.ai ?? false,
    },
  };
}

export function hasActiveFilters(filters: DiscoveryFilters): boolean {
  return (
    filters.query.length > 0 ||
    filters.features.setups ||
    filters.features.leaderboard ||
    filters.features.ai
  );
}

export function applyFilters(tracks: TrackListItem[], filters: DiscoveryFilters): TrackListItem[] {
  if (!hasActiveFilters(filters)) {
    return tracks;
  }

  return tracks.filter((track) => {
    const haystack =
      `${track.grandPrixName ?? ''} ${track.circuitName ?? ''} ${track.slug ?? ''}`.toLowerCase();
    const matchesQuery = filters.query.length === 0 || haystack.includes(filters.query);
    const matchesSetups = !filters.features.setups || track.hasSetups;
    const matchesLeaderboard = !filters.features.leaderboard || track.hasLeaderboard;
    const matchesAi = !filters.features.ai || track.hasAiDifficulty;
    return matchesQuery && matchesSetups && matchesLeaderboard && matchesAi;
  });
}

export function toTrackCard(track: TrackListItem): TrackCardView {
  return {
    id: track.id,
    title: track.grandPrixName ?? track.circuitName ?? track.slug,
    subtitle: track.circuitName ?? 'Unknown circuit',
    slug: track.slug,
    formattedLength: formatLength(track.lengthKm),
    trackImageUrl: track.trackImageUrl,
    badges: buildBadges(track),
  };
}

function formatLength(lengthKm: number | string | null | undefined): string {
  if (lengthKm === null || lengthKm === undefined) {
    return 'N/A';
  }

  const value = typeof lengthKm === 'string' ? parseFloat(lengthKm) : lengthKm;
  if (Number.isNaN(value)) {
    return 'N/A';
  }

  return `${value.toFixed(3)} km`;
}

function buildBadges(track: TrackListItem): TrackBadgeView[] {
  const badges: TrackBadgeView[] = [];

  if (track.hasSetups) {
    badges.push({label: 'Setups', tone: 'accent'});
  }
  if (track.hasLeaderboard) {
    badges.push({label: 'Leaderboard', tone: 'info'});
  }
  if (track.hasAiDifficulty) {
    badges.push({label: 'AI Curve', tone: 'warning'});
  }
  if (badges.length === 0) {
    badges.push({label: 'Scouting', tone: 'success'});
  }

  return badges;
}
