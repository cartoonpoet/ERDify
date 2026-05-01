import axios from "axios";
import { useAuthStore } from "../stores/useAuthStore";

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10_000
});

httpClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
