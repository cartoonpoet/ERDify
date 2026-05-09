import { useNavigate } from "react-router-dom";
import * as css from "../unified-sidebar.css";

interface SidebarBottomBarProps {
  orgId: string | undefined;
  apiKeysActive: boolean;
}

export const SidebarBottomBar = ({ orgId, apiKeysActive }: SidebarBottomBarProps) => {
  const navigate = useNavigate();

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
    </div>
  );
};
