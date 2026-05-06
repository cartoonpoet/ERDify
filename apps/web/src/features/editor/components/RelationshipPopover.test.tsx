import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { RelationshipPopover } from "./RelationshipPopover";
import { useEditorStore } from "../stores/useEditorStore";

vi.mock("../stores/useEditorStore");
vi.mock("@erdify/domain", () => ({
  updateRelationship: vi.fn((doc) => doc),
  removeRelationship: vi.fn((doc) => doc),
  updateColumn: vi.fn((doc) => doc),
}));
vi.mock("./relationship-popover.css", () => ({
  popover: "",
  arrow: "",
  section: "",
  sectionLabel: "",
  toggleRow: "",
  toggleBtn: "",
  toggleBtnActive: "",
  select: "",
  deleteBtn: "",
}));

const sampleRel = {
  id: "rel-1",
  sourceEntityId: "e-src",
  targetEntityId: "e-tgt",
  sourceColumnIds: ["col-1"],
  targetColumnIds: ["col-pk"],
  cardinality: "many-to-one" as const,
  onDelete: "no-action" as const,
  onUpdate: "no-action" as const,
  identifying: false,
  name: "fk_rel",
};

const sampleDoc = {
  relationships: [sampleRel],
  entities: [
    {
      id: "e-src",
      name: "Orders",
      columns: [
        {
          id: "col-1",
          name: "user_id",
          type: "int",
          nullable: true,
          primaryKey: false,
          unique: false,
          defaultValue: null,
          comment: null,
          ordinal: 0,
        },
      ],
    },
  ],
};

const mockApplyCommand = vi.fn();
const mockSetSelectedRelationship = vi.fn();
const mockSetPopoverPos = vi.fn();
const mockSetPendingRelDelete = vi.fn();

const setupStoreMock = (doc: typeof sampleDoc | null = sampleDoc) => {
  vi.mocked(useEditorStore).mockImplementation((selector: any) =>
    selector({
      document: doc,
      applyCommand: mockApplyCommand,
      setSelectedRelationship: mockSetSelectedRelationship,
      setPopoverPos: mockSetPopoverPos,
      setPendingRelDelete: mockSetPendingRelDelete,
    })
  );
};

describe("RelationshipPopover", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupStoreMock();
  });

  it("renders popover with role=dialog when relationship exists; renders nothing when not found", () => {
    render(<RelationshipPopover relationshipId="rel-1" pos={{ x: 100, y: 100 }} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // When relationship not found
    const { container } = render(
      <RelationshipPopover relationshipId="non-existent" pos={{ x: 0, y: 0 }} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders "식별" button with aria-pressed="false" when rel.identifying is false', () => {
    render(<RelationshipPopover relationshipId="rel-1" pos={{ x: 100, y: 100 }} />);
    const identifyingBtn = screen.getAllByRole("button").find((b) => b.textContent === "식별");
    expect(identifyingBtn).toBeDefined();
    expect(identifyingBtn).toHaveAttribute("aria-pressed", "false");
  });

  it('clicking "식별" button calls applyCommand', () => {
    render(<RelationshipPopover relationshipId="rel-1" pos={{ x: 100, y: 100 }} />);
    const identifyingBtn = screen.getAllByRole("button").find((b) => b.textContent === "식별")!;
    fireEvent.click(identifyingBtn);
    expect(mockApplyCommand).toHaveBeenCalled();
  });

  it('"관계 삭제" with sourceColumnIds calls setPendingRelDelete with correct data', () => {
    render(<RelationshipPopover relationshipId="rel-1" pos={{ x: 100, y: 100 }} />);
    const deleteBtn = screen.getByLabelText("관계 삭제");
    fireEvent.click(deleteBtn);
    expect(mockSetPendingRelDelete).toHaveBeenCalledWith({
      relId: "rel-1",
      srcEntityId: "e-src",
      fkColIds: ["col-1"],
      fkColNames: ["user_id"],
    });
  });
});
