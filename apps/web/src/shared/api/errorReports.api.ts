import { httpClient } from "./httpClient";

// Mirror of backend ErrorType — defined locally to avoid @erdify/db frontend dependency
export type ApiErrorType = "5xx" | "network" | "403" | "404";

export interface GroupedErrorReport {
  errorType: ApiErrorType;
  path: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  resolved: boolean;
}

export interface ErrorReportStats {
  "5xx": number;
  network: number;
  "403": number;
  "404": number;
}

export interface ErrorReportsResponse {
  groups: GroupedErrorReport[];
  stats: ErrorReportStats;
}

export const getErrorReports = async (params: {
  type?: ApiErrorType;
  resolved?: boolean;
  from?: string;
}): Promise<ErrorReportsResponse> => {
  const query = new URLSearchParams();
  if (params.type) query.set("type", params.type);
  if (params.resolved !== undefined) query.set("resolved", String(params.resolved));
  if (params.from) query.set("from", params.from);
  const { data } = await httpClient.get<ErrorReportsResponse>(`/error-reports?${query}`);
  return data;
};

export const resolveErrorReport = async (params: {
  path: string;
  errorType: ApiErrorType;
  note?: string;
}): Promise<void> => {
  await httpClient.patch("/error-reports/resolve", params);
};
