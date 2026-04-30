import type { OrgResponse } from "../../../shared/api/organizations.api";
import { rail, orgIconBase, orgIconVariants, addBtn } from "./OrgRail.css";

interface OrgRailProps {
  orgs: OrgResponse[];
  selectedOrgId: string | null;
  onSelect: (orgId: string) => void;
  onCreateOrg: () => void;
}

export const OrgRail = ({ orgs, selectedOrgId, onSelect, onCreateOrg }: OrgRailProps) => (
  <nav className={rail} aria-label="조직 목록">
    {orgs.map((org) => (
      <button
        key={org.id}
        className={[orgIconBase, orgIconVariants[selectedOrgId === org.id ? "active" : "inactive"]].join(" ")}
        onClick={() => onSelect(org.id)}
        title={org.name}
        data-active={selectedOrgId === org.id}
        aria-label={org.name}
        aria-pressed={selectedOrgId === org.id}
      >
        {org.name.charAt(0).toUpperCase()}
      </button>
    ))}
    <button className={addBtn} onClick={onCreateOrg} aria-label="새 조직 추가" title="새 조직 추가">
      +
    </button>
  </nav>
);
