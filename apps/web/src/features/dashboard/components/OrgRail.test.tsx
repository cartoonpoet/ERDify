import { render, screen, fireEvent } from "@testing-library/react";
import { OrgRail } from "./OrgRail";
import type { OrgResponse } from "../../../shared/api/organizations.api";

const orgs: OrgResponse[] = [
  { id: "1", name: "Acme Corp", ownerId: "u1", createdAt: "", updatedAt: "" },
  { id: "2", name: "My Team", ownerId: "u1", createdAt: "", updatedAt: "" },
];

describe("OrgRail", () => {
  it("각 조직의 첫 글자를 렌더링한다", () => {
    render(<OrgRail orgs={orgs} selectedOrgId={null} onSelect={vi.fn()} onCreateOrg={vi.fn()} />);
    expect(screen.getByTitle("Acme Corp")).toBeInTheDocument();
    expect(screen.getByTitle("My Team")).toBeInTheDocument();
  });

  it("조직 아이콘 클릭 시 onSelect가 해당 id로 호출된다", () => {
    const onSelect = vi.fn();
    render(<OrgRail orgs={orgs} selectedOrgId={null} onSelect={onSelect} onCreateOrg={vi.fn()} />);
    fireEvent.click(screen.getByTitle("Acme Corp"));
    expect(onSelect).toHaveBeenCalledWith("1");
  });

  it("selectedOrgId와 일치하는 아이콘은 active 상태다", () => {
    render(<OrgRail orgs={orgs} selectedOrgId="1" onSelect={vi.fn()} onCreateOrg={vi.fn()} />);
    expect(screen.getByTitle("Acme Corp")).toHaveAttribute("data-active", "true");
  });

  it("+버튼 클릭 시 onCreateOrg가 호출된다", () => {
    const onCreateOrg = vi.fn();
    render(<OrgRail orgs={orgs} selectedOrgId={null} onSelect={vi.fn()} onCreateOrg={onCreateOrg} />);
    fireEvent.click(screen.getByLabelText("새 조직 추가"));
    expect(onCreateOrg).toHaveBeenCalledTimes(1);
  });
});
