export interface SetupItem {
  id: number;
  userId: number | null;
  gameCode: string;
  trackSlug: string;
  title: string;
  notes: string | null;
  sessionType: string | null;
  weatherCondition: string | null;
  assistsPreset: string | null;
  inputDevice: string | null;
  fuelLoadKg: number | null;
  tyreCompound: string | null;
  score: number;
  upvotes: number;
  downvotes: number;
  userVote: number | null;
  hidden: boolean;
  setupValues: Record<string, unknown>;
  createdAt: string;
}

export interface SetupListResponse {
  gameCode: string | null;
  trackSlug: string | null;
  query: string | null;
  sessionType: string | null;
  weatherCondition: string | null;
  inputDevice: string | null;
  page: number;
  size: number;
  totalSetups: number;
  totalPages: number;
  setups: SetupItem[];
}

export interface PublishSetupPayload {
  gameCode: string;
  trackSlug: string;
  title: string;
  notes?: string | null;
  sessionType?: string | null;
  weatherCondition?: string | null;
  assistsPreset?: string | null;
  inputDevice?: string | null;
  fuelLoadKg?: number | null;
  tyreCompound?: string | null;
  setupValues: Record<string, unknown>;
}

export interface UpdateSetupPayload {
  title: string;
  notes?: string | null;
  sessionType?: string | null;
  weatherCondition?: string | null;
  assistsPreset?: string | null;
  inputDevice?: string | null;
  fuelLoadKg?: number | null;
  tyreCompound?: string | null;
  setupValues: Record<string, unknown>;
}

export type SetupFieldType = 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SELECT';

export interface SetupFieldDefinition {
  fieldKey: string;
  fieldLabel: string;
  fieldType: SetupFieldType;
  required: boolean;
  sortOrder: number;
  selectOptions: string[];
}

export interface SetupFieldSchemaResponse {
  gameCode: string;
  fields: SetupFieldDefinition[];
}

export interface SetupReportItem {
  id: number;
  setupId: number;
  reporterId: number;
  reason: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: number | null;
}

export interface SetupReportListResponse {
  status: string;
  page: number;
  size: number;
  totalReports: number;
  totalPages: number;
  reports: SetupReportItem[];
}

export interface AiDifficultyCurve {
  gameCode: string;
  trackSlug: string;
  slope: number;
  intercept: number;
  esportsRefTimeMs: number | null;
  avgRefTimeMs: number | null;
  curveVersion: number;
  source: string | null;
}

export interface CalculateAiDifficultyPayload {
  lapTimeMs: number;
}

export interface AiDifficultyCalculationResponse {
  difficulty: number;
  confidence: {
    min: number;
    max: number;
  };
  curveVersion: number;
  notes: string;
}
