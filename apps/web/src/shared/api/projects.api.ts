import { httpClient } from "./httpClient";

export interface ProjectResponse {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export const listProjects = (orgId: string): Promise<ProjectResponse[]> =>
  httpClient.get<ProjectResponse[]>(`/organizations/${orgId}/projects`).then((r) => r.data);

export const createProject = (
  orgId: string,
  body: { name: string }
): Promise<ProjectResponse> =>
  httpClient.post<ProjectResponse>(`/organizations/${orgId}/projects`, body).then((r) => r.data);

export const deleteProject = (orgId: string, projectId: string): Promise<void> =>
  httpClient.delete(`/organizations/${orgId}/projects/${projectId}`).then(() => undefined);
