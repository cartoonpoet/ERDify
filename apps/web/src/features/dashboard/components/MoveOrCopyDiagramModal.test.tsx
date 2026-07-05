import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MoveOrCopyDiagramModal } from "./MoveOrCopyDiagramModal";
import { moveDiagram, duplicateDiagram } from "@/shared/api/diagrams.api";
import type { DiagramListItem } from "@/shared/api/diagrams.api";
import { listProjects } from "@/shared/api/projects.api";
import type { ProjectResponse } from "@/shared/api/projects.api";

vi.mock("@/shared/api/diagrams.api", () => ({
  moveDiagram: vi.fn(),
  duplicateDiagram: vi.fn(),
}));
vi.mock("@/shared/api/projects.api", () => ({ listProjects: vi.fn() }));
vi.mock("./modal-form.css", () => ({ form: "", footer: "", selectInput: "" }));
vi.mock("react-router-dom", () => ({ useParams: () => ({ orgId: "org-1" }) }));

vi.mock("@/components", () => ({
  Modal: ({ open, children, title }: { open: boolean; children: React.ReactNode; title?: string }) =>
    open ? (
      <div role="dialog">
        {title && <div>{title}</div>}
        {children}
      </div>
    ) : null,
  Button: ({
    children,
    disabled,
    onClick,
    type,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    type?: string;
    [k: string]: unknown;
  }) => (
    <button type={type as "button" | "submit" | undefined} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}));

const createQc = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

const wrap = (ui: React.ReactElement, qc = createQc()) =>
  render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);

const makeProject = (id: string, name: string): ProjectResponse => ({
  id,
  organizationId: "org-1",
  name,
  description: null,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
});

const projects: ProjectResponse[] = [
  makeProject("proj-1", "Current Project"),
  makeProject("proj-2", "Target A"),
  makeProject("proj-3", "Target B"),
];

const sampleDiagram: DiagramListItem = {
  id: "d-1",
  projectId: "proj-1",
  name: "My ERD",
  dialect: "postgresql",
  previewEntities: [],
  createdBy: "u-1",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  shareToken: null,
  shareExpiresAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listProjects).mockResolvedValue(projects);
});

describe("MoveOrCopyDiagramModal", () => {
  it("대상 select에 현재 프로젝트를 제외한 후보만 렌더한다", async () => {
    wrap(<MoveOrCopyDiagramModal open mode="move" diagram={sampleDiagram} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Target A" })).toBeInTheDocument();
    });
    expect(screen.getByRole("option", { name: "Target B" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Current Project" })).not.toBeInTheDocument();
  });

  it('mode="move" 확인 시 moveDiagram(id, targetId)가 호출되고 onClose가 실행된다', async () => {
    vi.mocked(moveDiagram).mockResolvedValue({} as never);
    const onClose = vi.fn();
    wrap(<MoveOrCopyDiagramModal open mode="move" diagram={sampleDiagram} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Target A" })).toBeInTheDocument();
    });
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);

    await waitFor(() => {
      expect(moveDiagram).toHaveBeenCalledWith("d-1", "proj-2");
      expect(onClose).toHaveBeenCalledTimes(1);
    });
    expect(duplicateDiagram).not.toHaveBeenCalled();
  });

  it('mode="copy" 확인 시 duplicateDiagram(id, { targetProjectId })가 호출된다', async () => {
    vi.mocked(duplicateDiagram).mockResolvedValue({} as never);
    const onClose = vi.fn();
    wrap(<MoveOrCopyDiagramModal open mode="copy" diagram={sampleDiagram} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Target A" })).toBeInTheDocument();
    });
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);

    await waitFor(() => {
      expect(duplicateDiagram).toHaveBeenCalledWith("d-1", { targetProjectId: "proj-2" });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
    expect(moveDiagram).not.toHaveBeenCalled();
  });

  it("선택한 대상 프로젝트로 API가 호출된다", async () => {
    vi.mocked(moveDiagram).mockResolvedValue({} as never);
    wrap(<MoveOrCopyDiagramModal open mode="move" diagram={sampleDiagram} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Target B" })).toBeInTheDocument();
    });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "proj-3" } });
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);

    await waitFor(() => {
      expect(moveDiagram).toHaveBeenCalledWith("d-1", "proj-3");
    });
  });

  it("프로젝트 목록 로딩 중에는 '없습니다' 안내 대신 로딩 문구를 노출한다", async () => {
    let resolveProjects: (value: ProjectResponse[]) => void = () => {};
    vi.mocked(listProjects).mockReturnValue(
      new Promise<ProjectResponse[]>((resolve) => {
        resolveProjects = resolve;
      }),
    );
    wrap(<MoveOrCopyDiagramModal open mode="move" diagram={sampleDiagram} onClose={vi.fn()} />);

    expect(screen.getByText("프로젝트 목록을 불러오는 중...")).toBeInTheDocument();
    expect(screen.queryByText("이동/복사할 수 있는 다른 프로젝트가 없습니다.")).not.toBeInTheDocument();

    resolveProjects(projects);
    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Target A" })).toBeInTheDocument();
    });
  });

  it("API 거부 시 에러 문구가 노출되고 모달이 유지된다(onClose 미호출)", async () => {
    vi.mocked(moveDiagram).mockRejectedValue(new Error("Server error"));
    const onClose = vi.fn();
    wrap(<MoveOrCopyDiagramModal open mode="move" diagram={sampleDiagram} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Target A" })).toBeInTheDocument();
    });
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);

    await waitFor(() => {
      expect(screen.getByText("이동에 실패했습니다.")).toBeInTheDocument();
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});
