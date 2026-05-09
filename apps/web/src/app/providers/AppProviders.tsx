import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { useState, useEffect } from "react";
import { BrowserRouter, useNavigate } from "react-router-dom";
import type { AxiosError } from "axios";
import { setNavigate } from "../../shared/api/httpClient";

const NavigateSetter = () => {
  const navigate = useNavigate();
  useEffect(() => { setNavigate(navigate); }, [navigate]);
  return null;
};

export const AppProviders = ({ children }: PropsWithChildren) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (count, error) => {
              const status = (error as AxiosError)?.response?.status;
              if (status === 403 || status === 404) return false;
              return count < 1;
            },
            throwOnError: true,
          },
        },
      })
  );

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <NavigateSetter />
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  );
};
