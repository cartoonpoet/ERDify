import { httpClient } from "./httpClient";

export interface AuthResponse {
  accessToken: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
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

export function getMe(): Promise<UserProfile> {
  return httpClient.get<UserProfile>("/auth/me").then((r) => r.data);
}

export function updateProfile(body: { name?: string; avatarUrl?: string | null }): Promise<UserProfile> {
  return httpClient.patch<UserProfile>("/auth/profile", body).then((r) => r.data);
}

export function changePassword(body: { currentPassword: string; newPassword: string }): Promise<void> {
  return httpClient.patch<void>("/auth/password", body).then((r) => r.data);
}
