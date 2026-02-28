export type ProfileVisibility = 'PUBLIC' | 'PRIVATE';

export interface Profile {
  userId: number;
  displayName: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  country: string | null;
  languages: string[];
  visibility: ProfileVisibility;
  avatarUrl: string | null;
  owner: boolean;
}

export interface UpdateProfilePayload {
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  country: string | null;
  languages: string[];
  visibility: ProfileVisibility;
}

export interface ProfilePictureResponse {
  avatarUrl: string | null;
}
