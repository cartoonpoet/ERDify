import { matchPath } from "react-router-dom";
import { getErrorStatus } from "@/shared/utils/queryErrorContent";
import { API_BASE_URL } from "@/shared/api/httpClient";

// ── Sensitive field blacklist ──────────────────────────────────────────────────
const SENSITIVE_KEYS = [
  "password", "token", "secret", "authorization",
  "apiKey", "api_key", "accessToken", "refreshToken",
];

export const sanitize = (obj: unknown): unknown => {
  if (typeof obj !== "object" || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
      k,
      SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s.toLowerCase()))
        ? "[REDACTED]"
        : sanitize(v),
    ]),
  );
};

// ── Page name auto-mapping ─────────────────────────────────────────────────────
const ROUTE_NAMES: Array<{ pattern: string; name: string }> = [
  { pattern: "/diagrams/:diagramId",   name: "다이어그램 편집" },
  { pattern: "/share/:shareToken",     name: "공유 다이어그램" },
  { pattern: "/admin/error-reports",   name: "에러 리포트 관리" },
  { pattern: "/admin/announcements",   name: "공지사항 관리" },
  { pattern: "/login",                 name: "로그인" },
  { pattern: "/register",              name: "회원가입" },
  { pattern: "/forgot-password",       name: "비밀번호 찾기" },
  { pattern: "/reset-password",        name: "비밀번호 재설정" },
  { pattern: "/:orgId/members",        name: "멤버 관리" },
  { pattern: "/:orgId/api-keys",       name: "API 키" },
  { pattern: "/:orgId/settings",       name: "조직 설정" },
  { pattern: "/:orgId/:projectId",     name: "프로젝트" },
  { pattern: "/:orgId",                name: "대시보드" },
];

export const getPageName = (pathname: string): string | null => {
  for (const { pattern, name } of ROUTE_NAMES) {
    if (matchPath(pattern, pathname)) return name;
  }
  return null;
};

// ── JSON safe parse ────────────────────────────────────────────────────────────
const tryParseJson = (s: string): unknown => {
  try { return JSON.parse(s); } catch { return null; }
};

// ── Deduplication ─────────────────────────────────────────────────────────────
const recentlyReported = new Set<string>();

export const _resetDedup = () => recentlyReported.clear();

// ── Main reporter ─────────────────────────────────────────────────────────────
export const reportError = (
  error: unknown,
  context: { path: string; url: string },
): void => {
  const errorType = String(getErrorStatus(error)) as "5xx" | "network" | "403" | "404";
  const httpStatus = (error as { response?: { status?: number } })?.response?.status ?? null;
  const dedupKey = `${errorType}:${context.path}`;

  if (recentlyReported.has(dedupKey)) return;
  recentlyReported.add(dedupKey);
  setTimeout(() => recentlyReported.delete(dedupKey), 60_000);

  // Extract Axios error context
  const config = (error as { config?: { method?: string; data?: unknown; params?: unknown } })?.config;
  const responseData = (error as { response?: { data?: unknown } })?.response?.data;

  const requestMethod = config?.method?.toUpperCase() ?? null;

  const rawData = config?.data;
  const parsedData = typeof rawData === "string" ? tryParseJson(rawData) : rawData;
  const requestBody = parsedData != null ? JSON.stringify(sanitize(parsedData)) : null;

  const rawParams = config?.params;
  const requestParams = rawParams != null ? JSON.stringify(sanitize(rawParams)) : null;

  const responseBody = responseData != null ? JSON.stringify(responseData) : null;

  const pageName = getPageName(window.location.pathname);

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
      pageName,
      requestMethod,
      requestBody,
      requestParams,
      responseBody,
    }),
  }).catch(() => {
    // fire-and-forget — never surfaces to the user
  });
};
