import type { DiagramDocument } from "@erdify/domain";
import { MCP_SESSION_ID } from "./session.js";

const API_URL = process.env.ERDIFY_API_URL ?? "http://localhost:3000";
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

export const client = {
  getOrganizations: () => request<OrganizationItem[]>("GET", "/organizations"),
  getProjects: (organizationId: string) =>
    request<ProjectItem[]>("GET", `/organizations/${organizationId}/projects`),
  getDiagrams: (projectId: string) =>
    request<DiagramItem[]>("GET", `/projects/${projectId}/diagrams`),
  getDiagram: (diagramId: string) =>
    request<DiagramResponse>("GET", `/diagrams/${diagramId}`),
  updateDiagram: (diagramId: string, content: DiagramDocument) =>
    request<void>("PATCH", `/diagrams/${diagramId}`, { content }),
  recordToolCall: (diagramId: string, tool: string, summary: string) =>
    request<void>("POST", `/diagrams/${diagramId}/mcp-sessions/${MCP_SESSION_ID}/tool-calls`, {
      tool,
      summary,
    }),
};
