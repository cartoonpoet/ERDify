import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/shared/api/auth.api";
import * as css from "./unified-sidebar.css";

interface SidebarBottomBarProps {
  orgId: string | undefined;
  apiKeysActive: boolean;
}

export const SidebarBottomBar = ({ orgId, apiKeysActive }: SidebarBottomBarProps) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });

  const isAdmin = !!me?.isAdmin;
  const errorReportsActive = pathname === "/admin/error-reports";

  return (
    <div className={css.sidebarBottomBar}>
      <button
        className={[css.projRow, apiKeysActive ? css.projRowActive : ""].filter(Boolean).join(" ")}
        onClick={() => { if (orgId) navigate(`/${orgId}/api-keys`); }}
        aria-pressed={apiKeysActive}
      >
        <span className={css.projArrow} aria-hidden="true" />
        <span className={css.projIcon} aria-hidden="true">🔑</span>
        <span className={css.projName}>API 키</span>
      </button>
      {isAdmin && (
        <button
          className={[css.projRow, errorReportsActive ? css.projRowActive : ""].filter(Boolean).join(" ")}
          onClick={() => navigate("/admin/error-reports")}
          aria-pressed={errorReportsActive}
        >
          <span className={css.projArrow} aria-hidden="true" />
          <span className={css.projIcon} aria-hidden="true">🚨</span>
          <span className={css.projName}>에러 리포트</span>
        </button>
      )}
    </div>
  );
};
