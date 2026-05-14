import type { ProjectResponse } from "@erdify/contracts";
import { httpClient } from "./httpClient";

export type { ProjectResponse };

export const listProjects = (orgId: string): Promise<ProjectResponse[]> =>
  httpClient.get<ProjectResponse[]>(`/organizations/${orgId}/projects`).then((r) => r.data);
export const createProject = (orgId: string, body: { name: string }): Promise<ProjectResponse> =>
  httpClient.post<ProjectResponse>(`/organizations/${orgId}/projects`, body).then((r) => r.data);
export const updateProject = (orgId: string, projectId: string, body: { name?: string }): Promise<ProjectResponse> =>
  httpClient.patch<ProjectResponse>(`/organizations/${orgId}/projects/${projectId}`, body).then((r) => r.data);
export const deleteProject = (orgId: string, projectId: string): Promise<void> =>
  httpClient.delete(`/organizations/${orgId}/projects/${projectId}`).then(() => undefined);
