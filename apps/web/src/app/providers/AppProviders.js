import { jsx as _jsx } from "react/jsx-runtime";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
export function AppProviders({ children }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 30_000,
                retry: 1
            }
        }
    }));
    return _jsx(QueryClientProvider, { client: queryClient, children: children });
}
