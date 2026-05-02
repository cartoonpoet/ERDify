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
  // 로그인 완료 확인 → 즉시 렌더 (isError 캐시 무시)
  if (isAuthenticated === true) return <Outlet />;

  // 쿠키 검증 중 (첫 진입)
  if (isPending) return null;

  // 검증 실패 or 명시적 로그아웃
  return <Navigate to="/login" replace />;
};
