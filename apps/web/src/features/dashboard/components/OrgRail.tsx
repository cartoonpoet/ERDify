import type { OrgResponse } from "../../../shared/api/organizations.api";
import { rail, orgWrapper, orgIconBase, orgIconVariants, orgDeleteBtn, addBtn } from "./OrgRail.css";

interface OrgRailProps {
  orgs: OrgResponse[];
  selectedOrgId: string | null;
  onSelect: (orgId: string) => void;
  onDeleteOrg: (orgId: string) => void;
  onCreateOrg: () => void;
}

export const OrgRail = ({ orgs, selectedOrgId, onSelect, onDeleteOrg, onCreateOrg }: OrgRailProps) => (
  <nav className={rail} aria-label="조직 목록">
    {orgs.map((org) => (
      <div key={org.id} className={orgWrapper}>
        <button
          className={[orgIconBase, orgIconVariants[selectedOrgId === org.id ? "active" : "inactive"]].join(" ")}
          onClick={() => onSelect(org.id)}
          title={org.name}
          aria-label={org.name}
          aria-pressed={selectedOrgId === org.id}
        >
          {org.name.charAt(0).toUpperCase()}
        </button>
        <button
          className={orgDeleteBtn}
          aria-label={`${org.name} 삭제`}
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(`"${org.name}" 조직을 삭제하시겠습니까? 모든 프로젝트와 ERD가 함께 삭제됩니다.`)) {
              onDeleteOrg(org.id);
            }
          }}
        >
          ×
        </button>
      </div>
    ))}
    <button className={addBtn} onClick={onCreateOrg} aria-label="새 조직 추가" title="새 조직 추가">
      +
    </button>
  </nav>
);
