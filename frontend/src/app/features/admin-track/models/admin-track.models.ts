export interface AdminTrack {
  id: number;
  gameCode: string;
  slug: string;
  grandPrixName: string | null;
  circuitName: string | null;
  lengthKm: number | string | null;
  trackImageUrl: string | null;
}

export interface AdminTrackListResponse {
  gameCode: string;
  tracks: AdminTrack[];
}

export interface UpdateAdminTrackPayload {
  slug?: string;
  grandPrixName?: string | null;
  circuitName?: string | null;
  lengthKm?: number | null;
}

export interface CreateAdminTrackPayload {
  slug: string;
  grandPrixName?: string | null;
  circuitName?: string | null;
  lengthKm?: number | null;
}

export interface TrackPhotoUploadResponse {
  trackImageUrl: string | null;
}
