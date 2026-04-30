import { render, screen } from "@testing-library/react";
import { PresenceIndicator } from "./PresenceIndicator";
import type { Collaborator } from "../hooks/useRealtimeCollaboration";

describe("PresenceIndicator", () => {
  it("renders nothing when collaborators list is empty", () => {
    const { container } = render(<PresenceIndicator collaborators={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders one avatar per collaborator with title attribute", () => {
    const collaborators: Collaborator[] = [
      { userId: "alice@example.com", color: "#ef4444", selectedEntityId: null },
      { userId: "bob@example.com", color: "#3b82f6", selectedEntityId: null }
    ];
    render(<PresenceIndicator collaborators={collaborators} />);
    expect(screen.getByTitle("alice@example.com")).toBeTruthy();
    expect(screen.getByTitle("bob@example.com")).toBeTruthy();
  });

  it("applies collaborator color as background style", () => {
    const collaborators: Collaborator[] = [
      { userId: "carol@example.com", color: "#22c55e", selectedEntityId: null }
    ];
    render(<PresenceIndicator collaborators={collaborators} />);
    const avatar = screen.getByTitle("carol@example.com");
    expect(avatar.style.background).toBe("rgb(34, 197, 94)");
  });

  it("shows outline when collaborator has a selected entity", () => {
    const collaborators: Collaborator[] = [
      { userId: "dave@example.com", color: "#8b5cf6", selectedEntityId: "entity-1" }
    ];
    render(<PresenceIndicator collaborators={collaborators} />);
    const avatar = screen.getByTitle("dave@example.com");
    expect(avatar.style.outline).toBeTruthy();
  });

  it("shows no outline when collaborator has no selected entity", () => {
    const collaborators: Collaborator[] = [
      { userId: "eve@example.com", color: "#f97316", selectedEntityId: null }
    ];
    render(<PresenceIndicator collaborators={collaborators} />);
    const avatar = screen.getByTitle("eve@example.com");
    expect(avatar.style.outline).toBe("none");
  });
});
