import { httpClient } from "./httpClient";

export interface ApiKeyItem {
  id: string;
  name: string | null;
  prefix: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface ApiKeyCreated {
  apiKey: string;
  id: string;
  name: string | null;
  prefix: string;
  expiresAt: string | null;
  createdAt: string;
}

export const listApiKeys = (): Promise<ApiKeyItem[]> =>
  httpClient.get<ApiKeyItem[]>("/auth/api-keys").then((r) => r.data);

export const createApiKey = (body: { name?: string; expiresAt?: string }): Promise<ApiKeyCreated> =>
  httpClient.post<ApiKeyCreated>("/auth/api-keys", body).then((r) => r.data);

export const revokeApiKey = (id: string): Promise<void> =>
  httpClient.delete(`/auth/api-keys/${id}`).then(() => undefined);

export const regenerateApiKey = (id: string): Promise<ApiKeyCreated> =>
  httpClient.post<ApiKeyCreated>(`/auth/api-keys/${id}/regenerate`).then((r) => r.data);
