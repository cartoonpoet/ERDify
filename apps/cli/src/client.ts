import type { DiagramDocument } from "@erdify/domain";
import { getApiKey, getApiUrl } from "./config.js";

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
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("API key not set. Run: erdify login");
    process.exit(1);
  }

  const res = await fetch(`${getApiUrl()}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

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
};
