export interface TrackListItem {
  id: number;
  slug: string;
  grandPrixName: string | null;
  circuitName: string | null;
  lengthKm: number | string | null;
  hasSetups: boolean;
  hasLeaderboard: boolean;
  hasAiDifficulty: boolean;
  trackImageUrl: string | null;
}

export interface TrackListResponse {
  gameCode: string;
  tracks: TrackListItem[];
  page?: number;
  size?: number;
  totalTracks?: number;
  totalPages?: number;
}

export type TrackFeature = 'setups' | 'leaderboard' | 'ai';
