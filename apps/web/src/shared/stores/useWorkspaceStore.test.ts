import { useWorkspaceStore } from "./useWorkspaceStore";

afterEach(() => {
  useWorkspaceStore.setState({
    selectedOrganizationId: null,
    selectedProjectId: null,
  });
  localStorage.clear();
});

it("initial state: both IDs are null", () => {
  const { selectedOrganizationId, selectedProjectId } =
    useWorkspaceStore.getState();
  expect(selectedOrganizationId).toBeNull();
  expect(selectedProjectId).toBeNull();
});

it("selectOrganization sets organizationId and resets projectId", () => {
  useWorkspaceStore.getState().selectOrganization("org-1");
  const { selectedOrganizationId, selectedProjectId } =
    useWorkspaceStore.getState();
  expect(selectedOrganizationId).toBe("org-1");
  expect(selectedProjectId).toBeNull();
});

it("selectProject sets projectId", () => {
  useWorkspaceStore.getState().selectOrganization("org-1");
  useWorkspaceStore.getState().selectProject("proj-1");
  expect(useWorkspaceStore.getState().selectedProjectId).toBe("proj-1");
});

it("reset sets both IDs to null", () => {
  useWorkspaceStore.getState().selectOrganization("org-1");
  useWorkspaceStore.getState().selectProject("proj-1");
  useWorkspaceStore.getState().reset();
  const { selectedOrganizationId, selectedProjectId } =
    useWorkspaceStore.getState();
  expect(selectedOrganizationId).toBeNull();
  expect(selectedProjectId).toBeNull();
});

it("selectOrganization resets selectedProjectId even if a project was previously selected", () => {
  useWorkspaceStore.getState().selectOrganization("org-1");
  useWorkspaceStore.getState().selectProject("proj-1");
  useWorkspaceStore.getState().selectOrganization("org-2");
  const { selectedOrganizationId, selectedProjectId } =
    useWorkspaceStore.getState();
  expect(selectedOrganizationId).toBe("org-2");
  expect(selectedProjectId).toBeNull();
});
