import type { ApiErrorType } from "@/shared/api/errorReports.api";

export const queryKeys = {
  // Auth
  authCheck: () => ["auth-check"] as const,
  me: () => ["me"] as const,

  // Organizations
  orgs: () => ["orgs"] as const,

  // Projects
  projects: (orgId: string) => ["projects", orgId] as const,

  // Diagrams
  diagrams: (projectId: string) => ["diagrams", projectId] as const,
  diagramsAll: () => ["diagrams"] as const,
  diagram: (diagramId: string) => ["diagram", diagramId] as const,
  diagramVersions: (diagramId: string) => ["diagram-versions", diagramId] as const,
  publicDiagram: (shareToken: string) => ["public-diagram", shareToken] as const,
  activeDiagramUsers: (key: string) => ["active-diagram-users", key] as const,

  // Members & Invites
  members: (orgId: string) => ["members", orgId] as const,
  invites: (orgId: string) => ["invites", orgId] as const,

  // API Keys
  apiKeys: () => ["api-keys"] as const,

  // AI Settings
  orgAiSettings: (orgId: string) => ["org-ai-settings", orgId] as const,

  // MCP
  mcpSessions: (diagramId: string) => ["mcp-sessions", diagramId] as const,

  // Announcements
  announcementsActive: () => ["announcements-active"] as const,
  adminAnnouncements: () => ["admin-announcements"] as const,

  // Admin - Error Reports
  adminErrorReportsAll: () => ["admin", "error-reports"] as const,
  adminErrorReports: (tab: string, typeFilter: ApiErrorType | undefined) =>
    ["admin", "error-reports", tab, typeFilter] as const,
  errorReportOccurrences: (errorType: ApiErrorType, path: string) =>
    ["error-report-occurrences", errorType, path] as const,
};
