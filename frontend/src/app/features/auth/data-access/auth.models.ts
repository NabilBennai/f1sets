export interface AuthUser {
  id: number;
  email: string;
  displayName: string;
  role: 'USER' | 'ADMIN';
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: AuthUser;
}

export interface MessageResponse {
  message: string;
}

export interface ApiErrorResponse {
  message?: string;
}
