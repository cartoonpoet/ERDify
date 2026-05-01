import { httpClient } from "./httpClient";
import type { DiagramDocument } from "@erdify/domain";

export interface DiagramResponse {
  id: string;
  projectId: string;
  organizationId: string;
  name: string;
  content: DiagramDocument;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  myRole: "owner" | "editor" | "viewer";
  shareToken: string | null;
  shareExpiresAt: string | null;
}

export interface DiagramVersionResponse {
  id: string;
  diagramId: string;
  content: DiagramDocument;
  revision: number;
  createdBy: string;
  createdAt: string;
}

export function createDiagram(
  projectId: string,
  body: { name: string; dialect: "postgresql" | "mysql" | "mariadb"; content?: object }
): Promise<DiagramResponse> {
  return httpClient
    .post<DiagramResponse>(`/projects/${projectId}/diagrams`, body)
    .then((r) => r.data);
}

export function listDiagrams(projectId: string): Promise<DiagramResponse[]> {
  return httpClient
    .get<DiagramResponse[]>(`/projects/${projectId}/diagrams`)
    .then((r) => r.data);
}

export function getDiagram(diagramId: string): Promise<DiagramResponse> {
  return httpClient.get<DiagramResponse>(`/diagrams/${diagramId}`).then((r) => r.data);
}

export function updateDiagram(
  diagramId: string,
  body: { name?: string; content?: object }
): Promise<DiagramResponse> {
  return httpClient
    .patch<DiagramResponse>(`/diagrams/${diagramId}`, body)
    .then((r) => r.data);
}

export function saveVersion(diagramId: string): Promise<DiagramVersionResponse> {
  return httpClient
    .post<DiagramVersionResponse>(`/diagrams/${diagramId}/versions`)
    .then((r) => r.data);
}

export function listVersions(diagramId: string): Promise<DiagramVersionResponse[]> {
  return httpClient
    .get<DiagramVersionResponse[]>(`/diagrams/${diagramId}/versions`)
    .then((r) => r.data);
}

export function restoreVersion(diagramId: string, versionId: string): Promise<DiagramResponse> {
  return httpClient
    .post<DiagramResponse>(`/diagrams/${diagramId}/restore/${versionId}`)
    .then((r) => r.data);
}

export function deleteDiagram(diagramId: string): Promise<void> {
  return httpClient.delete(`/diagrams/${diagramId}`).then(() => undefined);
}

export type SharePreset = "1h" | "1d" | "7d" | "30d";

export interface ShareLinkResponse {
  shareToken: string;
  expiresAt: string;
}

export interface PublicDiagramResponse {
  id: string;
  name: string;
  content: DiagramDocument;
}

export function shareDiagram(diagramId: string, preset: SharePreset): Promise<ShareLinkResponse> {
  return httpClient
    .post<ShareLinkResponse>(`/diagrams/${diagramId}/share`, { preset })
    .then((r) => r.data);
}

export function revokeDiagramShare(diagramId: string): Promise<void> {
  return httpClient.delete(`/diagrams/${diagramId}/share`).then(() => undefined);
}

export function getPublicDiagram(shareToken: string): Promise<PublicDiagramResponse> {
  return httpClient
    .get<PublicDiagramResponse>(`/diagrams/public/${shareToken}`)
    .then((r) => r.data);
}
