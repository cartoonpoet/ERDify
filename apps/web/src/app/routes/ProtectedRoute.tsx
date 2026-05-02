import { Navigate, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "../../shared/api/auth.api";
import { useAuthStore } from "../../shared/stores/useAuthStore";

export const ProtectedRoute = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);

  const { isError, isPending } = useQuery({
    queryKey: ["auth-check"],
    queryFn: async () => {
      const user = await getMe();
      setAuthenticated(true);
      return user;
    },
    retry: false,
    enabled: isAuthenticated === null,
  });

  // /auth/me 실패 or 명시적 로그아웃 → 로그인 페이지
  if (isError || isAuthenticated === false) return <Navigate to="/login" replace />;

  // 쿠키 검증 중 (첫 진입)
  if (isAuthenticated === null && isPending) return null;

  return <Outlet />;
};
