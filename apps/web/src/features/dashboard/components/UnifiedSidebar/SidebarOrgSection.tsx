import { useState } from "react";
import type { FocusEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { OrgResponse } from "@/shared/api/organizations.api";
import { useDashboardStore } from "@/features/dashboard/store/useDashboardStore";
import { useDashboardActions } from "@/features/dashboard/hooks/useDashboardActions";
import * as css from "./unified-sidebar.css";

interface SidebarOrgSectionProps {
  orgs: OrgResponse[];
  orgId: string | undefined;
  projectCount: number;
}

export const SidebarOrgSection = ({
  orgs, orgId, projectCount,
}: SidebarOrgSectionProps) => {
  const navigate = useNavigate();
  const openModal = useDashboardStore((s) => s.openModal);
  const { deleteOrg } = useDashboardActions();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const selectedOrg = orgs.find((o) => o.id === orgId) ?? null;

  const handleSelectOrg = (id: string) => {
    navigate(`/${id}`);
    setDropdownOpen(false);
  };

  const handleWrapperBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDropdownOpen(false);
  };

  return (
    <div
      className={css.orgSelectorWrapper}
      tabIndex={-1}
      onBlur={handleWrapperBlur}
    >
      <button
        type="button"
        className={css.orgSelector}
        onClick={() => setDropdownOpen((v) => !v)}
        aria-expanded={dropdownOpen}
        aria-haspopup="true"
      >
        {selectedOrg ? (
          <>
            <div className={css.orgBadge} aria-hidden="true">
              {selectedOrg.name.charAt(0).toUpperCase()}
            </div>
            <div className={css.orgInfo}>
              <div className={css.orgName}>{selectedOrg.name}</div>
              <div className={css.orgSub}>{projectCount}개 프로젝트</div>
            </div>
          </>
        ) : (
          <span className={css.orgPlaceholder}>조직을 선택하세요</span>
        )}
        <span className={css.orgChevron} aria-hidden="true">⌄</span>
      </button>

      {/* 각 행이 선택 버튼 + 삭제 버튼을 함께 담고 있어 listbox/option 구조(단일 액션)와
          맞지 않으므로 role 없이 일반 팝업으로 다룬다 — 각 버튼은 네이티브 포커스/키보드를 그대로 지원한다. */}
      {dropdownOpen && (
        <div className={css.orgDropdown}>
          {orgs.map((org) => (
            <div key={org.id} className={css.orgDropdownItemWrapper}>
              <button
                type="button"
                className={css.orgDropdownItem}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectOrg(org.id);
                }}
              >
                <span className={css.checkMark} aria-hidden="true">
                  {org.id === orgId ? "✓" : ""}
                </span>
                <span className={css.orgBadgeSmall} aria-hidden="true">
                  {org.name.charAt(0).toUpperCase()}
                </span>
                <span className={css.orgDropdownName}>{org.name}</span>
              </button>
              <button
                type="button"
                className={css.orgDropdownDeleteBtn}
                aria-label={`${org.name} 삭제`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`"${org.name}" 조직을 삭제하시겠습니까? 모든 프로젝트와 ERD가 함께 삭제됩니다.`)) {
                    deleteOrg(org.id);
                  }
                  setDropdownOpen(false);
                }}
              >
                ×
              </button>
            </div>
          ))}
          <div className={css.orgDropdownDivider} />
          <button
            type="button"
            className={css.orgDropdownCreateBtn}
            onClick={(e) => {
              e.stopPropagation();
              openModal("org");
              setDropdownOpen(false);
            }}
          >
            + 새 조직 만들기
          </button>
        </div>
      )}
    </div>
  );
};
