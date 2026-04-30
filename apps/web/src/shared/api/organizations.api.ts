import { httpClient } from "./httpClient";

export interface OrgResponse {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export const listMyOrganizations = (): Promise<OrgResponse[]> =>
  httpClient.get<OrgResponse[]>("/organizations").then((r) => r.data);

export const createOrganization = (body: { name: string }): Promise<OrgResponse> =>
  httpClient.post<OrgResponse>("/organizations", body).then((r) => r.data);

export const getOrganization = (id: string): Promise<OrgResponse> =>
  httpClient.get<OrgResponse>(`/organizations/${id}`).then((r) => r.data);

export const deleteOrganization = (id: string): Promise<void> =>
  httpClient.delete(`/organizations/${id}`).then(() => undefined);
