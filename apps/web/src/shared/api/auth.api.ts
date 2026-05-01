import { httpClient } from "./httpClient";

export interface AuthResponse {
  accessToken: string;
}

export function register(body: {
  email: string;
  password: string;
  name: string;
}): Promise<AuthResponse> {
  return httpClient.post<AuthResponse>("/auth/register", body).then((r) => r.data);
}

export function login(body: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return httpClient.post<AuthResponse>("/auth/login", body).then((r) => r.data);
}

export function generateApiKey(): Promise<{ apiKey: string }> {
  return httpClient.post<{ apiKey: string }>("/auth/api-key").then((r) => r.data);
}
