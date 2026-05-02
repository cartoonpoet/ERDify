import axios from "axios";

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10_000,
  withCredentials: true, // httpOnly 쿠키 자동 첨부
});
