import { renderHook, act } from "@testing-library/react";
import * as Automerge from "@automerge/automerge";
import type { DiagramDocument } from "@erdify/domain";

const mockSocket = {
  on: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
  connected: false,
  id: "socket-1"
};

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => mockSocket)
}));

vi.mock("../../../shared/stores/useAuthStore", () => ({
  useAuthStore: vi.fn((selector: (s: { token: string | null }) => unknown) =>
    selector({ token: "test-token" })
  )
}));

const mockSetDocument = vi.fn();
const mockSetCollaborators = vi.fn();
const mockSubscribeUnsub = vi.fn();
const mockSubscribe = vi.fn(() => mockSubscribeUnsub);

const storeHook = Object.assign(
  vi.fn((selector: (s: { document: null; setDocument: typeof mockSetDocument; setCollaborators: typeof mockSetCollaborators }) => unknown) =>
    selector({ document: null, setDocument: mockSetDocument, setCollaborators: mockSetCollaborators })
  ),
  { subscribe: mockSubscribe }
);

vi.mock("../stores/useEditorStore", () => ({
  useEditorStore: storeHook
}));

import { useRealtimeCollaboration } from "./useRealtimeCollaboration";
import { io } from "socket.io-client";

function makeEmptyDoc(): DiagramDocument {
  return {
    format: "erdify.schema.v1",
    id: "d1",
    name: "Test",
    dialect: "postgresql",
    entities: [],
    relationships: [],
    indexes: [],
    views: [],
    layout: { entityPositions: {} },
    metadata: { revision: 1, stableObjectIds: true, createdAt: "", updatedAt: "" }
  };
}

describe("useRealtimeCollaboration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = false;
  });

  it("calls io with the collaboration namespace URL on mount", () => {
    renderHook(() => useRealtimeCollaboration("d1"));
    expect(io).toHaveBeenCalledWith(
      expect.stringContaining("/collaboration"),
      expect.objectContaining({ auth: { token: "Bearer test-token" } })
    );
  });

  it("disconnects socket and unsubscribes store on unmount", () => {
    const { unmount } = renderHook(() => useRealtimeCollaboration("d1"));
    unmount();
    expect(mockSocket.disconnect).toHaveBeenCalled();
    expect(mockSubscribeUnsub).toHaveBeenCalled();
  });

  it("emits join on connect", () => {
    renderHook(() => useRealtimeCollaboration("d1"));
    const connectCall = (mockSocket.on as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => c[0] === "connect"
    );
    act(() => { (connectCall![1] as () => void)(); });
    expect(mockSocket.emit).toHaveBeenCalledWith("join", { diagramId: "d1" });
  });

  it("calls setDocument with doc content on am:init", () => {
    renderHook(() => useRealtimeCollaboration("d1"));

    const doc = Automerge.from(makeEmptyDoc() as unknown as Record<string, unknown>);
    const bytes = Automerge.save(doc);

    const initCall = (mockSocket.on as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => c[0] === "am:init"
    );
    act(() => { (initCall![1] as (b: number[]) => void)(Array.from(bytes)); });

    expect(mockSetDocument).toHaveBeenCalledWith(
      expect.objectContaining({ entities: [], format: "erdify.schema.v1" })
    );
  });

  it("calls setDocument on am:change with updated content", () => {
    renderHook(() => useRealtimeCollaboration("d1"));

    const doc = Automerge.from(makeEmptyDoc() as unknown as Record<string, unknown>);
    const initBytes = Automerge.save(doc);
    const initCall = (mockSocket.on as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => c[0] === "am:init"
    );
    act(() => { (initCall![1] as (b: number[]) => void)(Array.from(initBytes)); });

    const newDoc = Automerge.change(doc, (d) => {
      (d.entities as DiagramDocument["entities"]).push({
        id: "e1", name: "Users", logicalName: null, comment: null, color: null, columns: []
      });
    });
    const change = Automerge.getLastLocalChange(newDoc)!;

    const changeCall = (mockSocket.on as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => c[0] === "am:change"
    );
    act(() => { (changeCall![1] as (b: number[]) => void)(Array.from(change)); });

    expect(mockSetDocument).toHaveBeenLastCalledWith(
      expect.objectContaining({ entities: expect.arrayContaining([expect.objectContaining({ id: "e1" })]) })
    );
  });

  it("calls setCollaborators in store from presence:state event", () => {
    renderHook(() => useRealtimeCollaboration("d1"));

    const collaborators = [{ userId: "u1", email: "u1@example.com", color: "#ef4444", selectedEntityId: null }];
    const presenceCall = (mockSocket.on as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => c[0] === "presence:state"
    );
    act(() => { (presenceCall![1] as (p: typeof collaborators) => void)(collaborators); });

    expect(mockSetCollaborators).toHaveBeenCalledWith(collaborators);
  });
});
