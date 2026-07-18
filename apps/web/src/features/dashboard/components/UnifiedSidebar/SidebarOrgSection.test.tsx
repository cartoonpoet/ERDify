import { render, screen, fireEvent } from "@testing-library/react";
import type { OrgResponse } from "@/shared/api/organizations.api";
import { SidebarOrgSection } from "./SidebarOrgSection";

vi.mock("./unified-sidebar.css", () => ({
  orgSelectorWrapper: "",
  orgSelector: "",
  orgBadge: "",
  orgInfo: "",
  orgName: "",
  orgSub: "",
  orgPlaceholder: "",
  orgChevron: "",
  orgDropdown: "",
  orgDropdownItemWrapper: "",
  orgDropdownItem: "",
  checkMark: "",
  orgBadgeSmall: "",
  orgDropdownName: "",
  orgDropdownDeleteBtn: "",
  orgDropdownDivider: "",
  orgDropdownCreateBtn: "",
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockOpenModal = vi.fn();
vi.mock("@/features/dashboard/store/useDashboardStore", () => ({
  useDashboardStore: (selector: (s: { openModal: typeof mockOpenModal }) => unknown) =>
    selector({ openModal: mockOpenModal }),
}));

const mockDeleteOrg = vi.fn();
vi.mock("@/features/dashboard/hooks/useDashboardActions", () => ({
  useDashboardActions: () => ({ deleteOrg: mockDeleteOrg }),
}));

const orgs: OrgResponse[] = [
  { id: "org-1", name: "Acme Corp", ownerId: "u1", createdAt: "", updatedAt: "" },
  { id: "org-2", name: "My Team", ownerId: "u1", createdAt: "", updatedAt: "" },
];

describe("SidebarOrgSection", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockOpenModal.mockClear();
    mockDeleteOrg.mockClear();
  });

  it("조직이 선택되지 않으면 placeholder 텍스트를 렌더링한다", () => {
    render(<SidebarOrgSection orgs={orgs} orgId={undefined} projectCount={0} />);
    expect(screen.getByText("조직을 선택하세요")).toBeInTheDocument();
  });

  it("orgId가 일치하는 조직의 이름과 배지를 렌더링한다", () => {
    render(<SidebarOrgSection orgs={orgs} orgId="org-1" projectCount={3} />);
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("3개 프로젝트")).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("조직 셀렉터 버튼 클릭 시 드롭다운이 열리고 다시 클릭하면 닫힌다", () => {
    render(<SidebarOrgSection orgs={orgs} orgId="org-1" projectCount={0} />);
    const selectorBtn = screen.getByText("Acme Corp").closest("button")!;
    expect(screen.queryByText("My Team")).not.toBeInTheDocument();

    fireEvent.click(selectorBtn);
    expect(screen.getByText("My Team")).toBeInTheDocument();

    fireEvent.click(selectorBtn);
    expect(screen.queryByText("My Team")).not.toBeInTheDocument();
  });

  it("드롭다운에서 조직 행 클릭 시 navigate가 호출되고 드롭다운이 닫힌다", () => {
    render(<SidebarOrgSection orgs={orgs} orgId="org-1" projectCount={0} />);
    const selectorBtn = screen.getByText("Acme Corp").closest("button")!;
    fireEvent.click(selectorBtn);

    fireEvent.click(screen.getByText("My Team").closest("button")!);

    expect(mockNavigate).toHaveBeenCalledWith("/org-2");
    expect(screen.queryByText("My Team")).not.toBeInTheDocument();
  });

  it("삭제 버튼 클릭 후 confirm이 true면 deleteOrg가 호출된다", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<SidebarOrgSection orgs={orgs} orgId="org-1" projectCount={0} />);
    const selectorBtn = screen.getByText("Acme Corp").closest("button")!;
    fireEvent.click(selectorBtn);

    fireEvent.click(screen.getByRole("button", { name: "My Team 삭제" }));

    expect(mockDeleteOrg).toHaveBeenCalledWith("org-2");
    vi.restoreAllMocks();
  });

  it("삭제 버튼 클릭 후 confirm이 false면 deleteOrg가 호출되지 않는다", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<SidebarOrgSection orgs={orgs} orgId="org-1" projectCount={0} />);
    const selectorBtn = screen.getByText("Acme Corp").closest("button")!;
    fireEvent.click(selectorBtn);

    fireEvent.click(screen.getByRole("button", { name: "My Team 삭제" }));

    expect(mockDeleteOrg).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("'+ 새 조직 만들기' 클릭 시 openModal('org')이 호출된다", () => {
    render(<SidebarOrgSection orgs={orgs} orgId="org-1" projectCount={0} />);
    const selectorBtn = screen.getByText("Acme Corp").closest("button")!;
    fireEvent.click(selectorBtn);

    fireEvent.click(screen.getByText("+ 새 조직 만들기"));

    expect(mockOpenModal).toHaveBeenCalledWith("org");
  });
});
