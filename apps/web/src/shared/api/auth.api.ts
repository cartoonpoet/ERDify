import { httpClient } from "./httpClient";

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
}): Promise<void> {
  return httpClient.post("/auth/register", body).then(() => undefined);
}

export function login(body: {
  email: string;
  password: string;
}): Promise<void> {
  return httpClient.post("/auth/login", body).then(() => undefined);
}

export function logout(): Promise<void> {
  return httpClient.post("/auth/logout").then(() => undefined);
}

export function generateApiKey(): Promise<{ apiKey: string }> {
  return httpClient.post<{ apiKey: string }>("/auth/api-keys").then((r) => r.data);
}

export function getMe(): Promise<UserProfile> {
  return httpClient.get<UserProfile>("/auth/me").then((r) => r.data);
}

export function updateProfile(body: { name?: string }): Promise<UserProfile> {
  return httpClient.patch<UserProfile>("/auth/profile", body).then((r) => r.data);
}

export function uploadAvatar(file: File): Promise<UserProfile> {
  const form = new FormData();
  form.append("file", file);
  return httpClient.post<UserProfile>("/auth/avatar", form, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then((r) => r.data);
}

export function changePassword(body: { currentPassword: string; newPassword: string }): Promise<void> {
  return httpClient.patch<void>("/auth/password", body).then((r) => r.data);
}
