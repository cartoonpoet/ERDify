import type { DiagramDocument } from "@erdify/domain";
import { MCP_SESSION_ID } from "./session.js";

// 원격 호스트를 http로 두면 nginx 301(http→https)에서 fetch가 Authorization 헤더를
// 떨궈 401이 난다. localhost를 제외하고 https로 강제한다.
const API_URL = (process.env.ERDIFY_API_URL ?? "https://erdify-app.kro.kr/api").replace(
  /^http:\/\/(?!localhost|127\.0\.0\.1)/,
  "https://"
);
const API_KEY = process.env.ERDIFY_API_KEY ?? "";

export interface OrganizationItem {
  id: string;
  name: string;
}

export interface ProjectItem {
  id: string;
  name: string;
}

export interface DiagramItem {
  id: string;
  name: string;
  updatedAt: string;
}

export interface DiagramResponse {
  id: string;
  name: string;
  content: DiagramDocument;
  organizationId: string;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const fetchOptions: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
      "X-MCP-Session-ID": MCP_SESSION_ID,
    },
  };
  if (body !== undefined) {
    fetchOptions.body = JSON.stringify(body);
  }
  const res = await fetch(`${API_URL}${path}`, fetchOptions);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ERDify API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// 단기 write-through 캐시: 에이전트가 한 다이어그램을 연속 편집할 때 매 도구마다
// 전체 문서를 GET하던 round-trip을 제거한다. 쓰기 후에는 로컬 최신 문서로 갱신.
const DIAGRAM_CACHE_TTL_MS = 5_000;
const diagramCache = new Map<string, { data: DiagramResponse; ts: number }>();

export const client = {
  getOrganizations: () => request<OrganizationItem[]>("GET", "/organizations"),
  getProjects: (organizationId: string) =>
    request<ProjectItem[]>("GET", `/organizations/${organizationId}/projects`),
  getDiagrams: (projectId: string) =>
    request<DiagramItem[]>("GET", `/projects/${projectId}/diagrams`),
  getDiagram: async (diagramId: string): Promise<DiagramResponse> => {
    const cached = diagramCache.get(diagramId);
    if (cached && Date.now() - cached.ts < DIAGRAM_CACHE_TTL_MS) return cached.data;
    const data = await request<DiagramResponse>("GET", `/diagrams/${diagramId}`);
    diagramCache.set(diagramId, { data, ts: Date.now() });
    return data;
  },
  updateDiagram: async (diagramId: string, content: DiagramDocument): Promise<void> => {
    await request<void>("PATCH", `/diagrams/${diagramId}`, { content });
    const prev = diagramCache.get(diagramId)?.data;
    diagramCache.set(diagramId, {
      data: { id: diagramId, name: prev?.name ?? "", organizationId: prev?.organizationId ?? "", content },
      ts: Date.now(),
    });
  },
  recordToolCall: (diagramId: string, tool: string, summary: string) =>
    request<void>("POST", `/diagrams/${diagramId}/mcp-sessions/${MCP_SESSION_ID}/tool-calls`, {
      tool,
      summary,
    }),
};
