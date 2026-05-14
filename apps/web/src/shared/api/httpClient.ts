import axios from "axios";

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

type NavigateFn = (path: string) => void;
let _navigate: NavigateFn | null = null;

export const setNavigate = (fn: NavigateFn | null) => { _navigate = fn; };

export const onResponseError = (error: unknown): Promise<never> => {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    // Note: this redirects with reason=expired for ALL 401s, including cold-start
    // (user never logged in). Distinguishing "expired" from "never logged in"
    // would require checking auth state here, which is not wired up yet.
    _navigate?.("/login?reason=expired");
  }
  return Promise.reject(error);
};

export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10_000,
  withCredentials: true, // httpOnly 쿠키 자동 첨부
});

httpClient.interceptors.response.use(
  (response) => response,
  onResponseError
);
