import { getErrorStatus } from "@/shared/utils/queryErrorContent";
import { API_BASE_URL } from "@/shared/api/httpClient";

const recentlyReported = new Set<string>();

export const _resetDedup = () => recentlyReported.clear();

export const reportError = (
  error: unknown,
  context: { path: string; url: string },
): void => {
  // getErrorStatus returns 403/404 as numbers; stringify for the API
  const errorType = String(getErrorStatus(error)) as "5xx" | "network" | "403" | "404";
  const httpStatus = (error as { response?: { status?: number } })?.response?.status ?? null;
  const dedupKey = `${errorType}:${context.path}`;

  if (recentlyReported.has(dedupKey)) return;
  recentlyReported.add(dedupKey);
  setTimeout(() => recentlyReported.delete(dedupKey), 60_000);

  fetch(`${API_BASE_URL}/error-reports`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      errorType,
      httpStatus,
      path: context.path,
      url: context.url,
      userAgent: navigator.userAgent,
    }),
  }).catch(() => {
    // fire-and-forget — never surfaces to the user
  });
};
