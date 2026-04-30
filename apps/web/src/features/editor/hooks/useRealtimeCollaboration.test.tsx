import { renderHook, act } from "@testing-library/react";
import * as Y from "yjs";

// Mock socket.io-client before importing the hook
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

// Mock useAuthStore
vi.mock("../../../shared/stores/useAuthStore", () => ({
  useAuthStore: vi.fn((selector: (s: { token: string | null }) => unknown) =>
    selector({ token: "test-token" })
  )
}));

// Track Zustand store state
let storeDoc: object | null = null;
let storeSelectedEntityId: string | null = null;
const mockSetDocument = vi.fn((doc: object) => { storeDoc = doc; });

vi.mock("../stores/useEditorStore", () => ({
  useEditorStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      document: storeDoc,
      setDocument: mockSetDocument,
      selectedEntityId: storeSelectedEntityId
    })
  )
}));

import { useRealtimeCollaboration } from "./useRealtimeCollaboration";
import { io } from "socket.io-client";

describe("useRealtimeCollaboration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeDoc = null;
    storeSelectedEntityId = null;
    mockSocket.connected = false;
  });

  it("calls io with the collaboration namespace URL on mount", () => {
    renderHook(() => useRealtimeCollaboration("d1"));
    expect(io).toHaveBeenCalledWith(
      expect.stringContaining("/collaboration"),
      expect.objectContaining({ auth: { token: "Bearer test-token" } })
    );
  });

  it("disconnects socket on unmount", () => {
    const { unmount } = renderHook(() => useRealtimeCollaboration("d1"));
    unmount();
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it("returns isConnected false initially", () => {
    const { result } = renderHook(() => useRealtimeCollaboration("d1"));
    expect(result.current.isConnected).toBe(false);
  });

  it("registers yjs:sync, yjs:update, presence:state, connect, disconnect event handlers", () => {
    renderHook(() => useRealtimeCollaboration("d1"));
    const registeredEvents = (mockSocket.on as ReturnType<typeof vi.fn>).mock.calls.map((c: unknown[]) => c[0]);
    expect(registeredEvents).toContain("connect");
    expect(registeredEvents).toContain("disconnect");
    expect(registeredEvents).toContain("yjs:sync");
    expect(registeredEvents).toContain("yjs:update");
    expect(registeredEvents).toContain("presence:state");
  });

  it("applies yjs:sync and calls setDocument with parsed content", () => {
    renderHook(() => useRealtimeCollaboration("d1"));

    const diagramContent = { entities: [], format: "erdify.schema.v1" };
    const ydoc = new Y.Doc();
    const sharedContent = ydoc.getMap<string>("content");
    ydoc.transact(() => {
      sharedContent.set("data", JSON.stringify(diagramContent));
    });
    const stateUpdate = Y.encodeStateAsUpdate(ydoc);

    const syncCall = (mockSocket.on as ReturnType<typeof vi.fn>).mock.calls.find((c: unknown[]) => c[0] === "yjs:sync");
    expect(syncCall).toBeTruthy();
    act(() => {
      (syncCall![1] as (u: Uint8Array) => void)(stateUpdate);
    });

    expect(mockSetDocument).toHaveBeenCalledWith(diagramContent);
  });

  it("applies yjs:update and calls setDocument", () => {
    renderHook(() => useRealtimeCollaboration("d1"));

    const diagramContent = { entities: [{ id: "e1" }], format: "erdify.schema.v1" };
    const ydoc = new Y.Doc();
    const sharedContent = ydoc.getMap<string>("content");
    ydoc.transact(() => {
      sharedContent.set("data", JSON.stringify(diagramContent));
    });
    const stateUpdate = Y.encodeStateAsUpdate(ydoc);

    const updateCall = (mockSocket.on as ReturnType<typeof vi.fn>).mock.calls.find((c: unknown[]) => c[0] === "yjs:update");
    act(() => {
      (updateCall![1] as (u: Uint8Array) => void)(stateUpdate);
    });

    expect(mockSetDocument).toHaveBeenCalledWith(diagramContent);
  });

  it("returns collaborators from presence:state event", () => {
    const { result } = renderHook(() => useRealtimeCollaboration("d1"));

    const collaborators = [{ userId: "u1", color: "#ef4444", selectedEntityId: null }];
    const presenceCall = (mockSocket.on as ReturnType<typeof vi.fn>).mock.calls.find((c: unknown[]) => c[0] === "presence:state");
    act(() => {
      (presenceCall![1] as (p: typeof collaborators) => void)(collaborators);
    });

    expect(result.current.collaborators).toEqual(collaborators);
  });

  it("emits join on connect", () => {
    renderHook(() => useRealtimeCollaboration("d1"));
    const connectCall = (mockSocket.on as ReturnType<typeof vi.fn>).mock.calls.find((c: unknown[]) => c[0] === "connect");
    act(() => {
      (connectCall![1] as () => void)();
    });
    expect(mockSocket.emit).toHaveBeenCalledWith("join", { diagramId: "d1" });
  });

  it("emits yjs:update when local document changes while connected", () => {
    // Set connected = true on the mock
    mockSocket.connected = true;

    // Provide an initial document
    storeDoc = { entities: [], format: "erdify.schema.v1" };

    const { rerender } = renderHook(() => useRealtimeCollaboration("d1"));

    // Trigger a document change by updating storeDoc and re-rendering
    storeDoc = { entities: [{ id: "new-entity" }], format: "erdify.schema.v1" };
    rerender();

    expect(mockSocket.emit).toHaveBeenCalledWith(
      "yjs:update",
      expect.any(Uint8Array)
    );
  });
});
