import type { UserProfile, SocialOnboardPayload } from "@erdify/contracts";
import { httpClient } from "./httpClient";

export type { UserProfile };

export function sendVerification(email: string): Promise<void> {
  return httpClient.post("/auth/send-verification", { email }).then(() => undefined);
}
export function verifyCode(email: string, code: string): Promise<{ verifiedToken: string }> {
  return httpClient.post<{ verifiedToken: string }>("/auth/verify-code", { email, code }).then((r) => r.data);
}
export function getInvite(token: string): Promise<{ email: string; verifiedToken: string }> {
  return httpClient.get<{ email: string; verifiedToken: string }>(`/auth/invite/${token}`).then((r) => r.data);
}
export function register(body: { email: string; password: string; name: string; phone?: string; verifiedToken: string }): Promise<void> {
  return httpClient.post("/auth/register", body).then(() => undefined);
}
export function login(body: { email: string; password: string }): Promise<void> {
  return httpClient.post("/auth/login", body).then(() => undefined);
}
export function logout(): Promise<void> {
  return httpClient.post("/auth/logout").then(() => undefined);
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
export function deleteAccount(): Promise<void> {
  return httpClient.delete("/auth/me").then(() => undefined);
}
export function forgotPassword(email: string): Promise<void> {
  return httpClient.post("/auth/forgot-password", { email }).then(() => undefined);
}
export function resetPassword(token: string, newPassword: string): Promise<void> {
  return httpClient.post("/auth/reset-password", { token, newPassword }).then(() => undefined);
}
export function completeOnboarding(body: SocialOnboardPayload): Promise<void> {
  return httpClient.post("/auth/social/onboard", body).then(() => undefined);
}
