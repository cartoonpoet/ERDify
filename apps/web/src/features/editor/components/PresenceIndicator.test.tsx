import { render, screen } from "@testing-library/react";
import { PresenceIndicator } from "./PresenceIndicator";
import { useEditorStore } from "../stores/useEditorStore";
import type { Collaborator } from "../stores/useEditorStore";

function setCollaborators(collaborators: Collaborator[]) {
  useEditorStore.setState({ collaborators });
}

afterEach(() => {
  useEditorStore.setState({ collaborators: [], document: null });
});

describe("PresenceIndicator", () => {
  it("renders nothing when collaborators list is empty", () => {
    setCollaborators([]);
    const { container } = render(<PresenceIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it("renders one avatar per collaborator with email tooltip", () => {
    const collaborators: Collaborator[] = [
      { userId: "u1", email: "alice@example.com", color: "#ef4444", selectedEntityId: null },
      { userId: "u2", email: "bob@example.com", color: "#3b82f6", selectedEntityId: null },
    ];
    setCollaborators(collaborators);
    render(<PresenceIndicator />);
    expect(screen.getByTitle("alice@example.com")).toBeTruthy();
    expect(screen.getByTitle("bob@example.com")).toBeTruthy();
  });

  it("applies collaborator color as background style", () => {
    setCollaborators([
      { userId: "u3", email: "carol@example.com", color: "#22c55e", selectedEntityId: null },
    ]);
    render(<PresenceIndicator />);
    const avatar = screen.getByTitle("carol@example.com");
    expect(avatar.style.background).toBe("rgb(34, 197, 94)");
  });

  it("shows outline when collaborator has a selected entity", () => {
    setCollaborators([
      { userId: "u4", email: "dave@example.com", color: "#8b5cf6", selectedEntityId: "entity-1" },
    ]);
    render(<PresenceIndicator />);
    const avatar = screen.getByTitle("dave@example.com");
    expect(avatar.style.outline).toBeTruthy();
  });

  it("shows no outline when collaborator has no selected entity", () => {
    setCollaborators([
      { userId: "u5", email: "eve@example.com", color: "#f97316", selectedEntityId: null },
    ]);
    render(<PresenceIndicator />);
    const avatar = screen.getByTitle("eve@example.com");
    expect(avatar.style.outline).toBe("none");
  });

  it("shows entity name in tooltip when collaborator is focused on one", () => {
    useEditorStore.setState({
      collaborators: [
        { userId: "u6", email: "frank@example.com", color: "#ef4444", selectedEntityId: "e1" },
      ],
      document: {
        format: "erdify.schema.v1",
        id: "doc-1",
        name: "test",
        dialect: "postgresql",
        entities: [
          {
            id: "e1",
            name: "Users",
            logicalName: null,
            comment: null,
            color: null,
            columns: [],
          },
        ],
        relationships: [],
        indexes: [],
        views: [],
        layout: { entityPositions: {} },
        metadata: { revision: 0, stableObjectIds: true, createdAt: "", updatedAt: "" },
      },
    });
    render(<PresenceIndicator />);
    expect(screen.getByTitle("frank@example.com — Users 편집 중")).toBeTruthy();
  });
});
