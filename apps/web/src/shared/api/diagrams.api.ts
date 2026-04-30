import { httpClient } from "./httpClient";
import type { DiagramDocument } from "@erdify/domain";

export interface DiagramResponse {
  id: string;
  projectId: string;
  name: string;
  content: DiagramDocument;
  createdAt: string;
  updatedAt: string;
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
  body: { name: string; dialect: "postgresql" | "mysql" | "mariadb" }
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
