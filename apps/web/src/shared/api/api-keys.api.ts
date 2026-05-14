import type { ApiKeyItem, ApiKeyCreated } from "@erdify/contracts";
import { httpClient } from "./httpClient";

export type { ApiKeyItem, ApiKeyCreated };

export const listApiKeys = (): Promise<ApiKeyItem[]> =>
  httpClient.get<ApiKeyItem[]>("/auth/api-keys").then((r) => r.data);
export const createApiKey = (body: { name?: string; expiresAt?: string }): Promise<ApiKeyCreated> =>
  httpClient.post<ApiKeyCreated>("/auth/api-keys", body).then((r) => r.data);
export const revokeApiKey = (id: string): Promise<void> =>
  httpClient.delete(`/auth/api-keys/${id}`).then(() => undefined);
export const regenerateApiKey = (id: string): Promise<ApiKeyCreated> =>
  httpClient.post<ApiKeyCreated>(`/auth/api-keys/${id}/regenerate`).then((r) => r.data);
