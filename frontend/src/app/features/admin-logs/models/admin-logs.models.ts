export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface AdminLogItem {
  id: number;
  createdAt: string;
  level: LogLevel;
  httpMethod: string;
  path: string;
  queryString: string | null;
  statusCode: number;
  durationMs: number;
  userEmail: string | null;
  userRole: string | null;
  clientIp: string | null;
  userAgent: string | null;
  message: string | null;
  requestPayloadJson: string | null;
  responseBodyJson: string | null;
}

export interface AdminLogListResponse {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  sortBy: string;
  sortDirection: string;
  level: string | null;
  httpMethod: string | null;
  statusFrom: number | null;
  statusTo: number | null;
  pathContains: string | null;
  userEmailContains: string | null;
  createdFrom: string | null;
  createdTo: string | null;
  items: AdminLogItem[];
}

export interface AdminLogQueryParams {
  level?: string;
  httpMethod?: string;
  statusFrom?: number;
  statusTo?: number;
  pathContains?: string;
  userEmailContains?: string;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
}
