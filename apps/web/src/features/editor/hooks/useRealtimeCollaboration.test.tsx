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

vi.mock("@/shared/store/useAuthStore", () => ({
  useAuthStore: vi.fn((selector: (s: { token: string | null }) => unknown) =>
    selector({ token: "test-token" })
  )
}));

// vi.mock is hoisted to the top of the file, so variables referenced in the
// factory must also be hoisted via vi.hoisted() to avoid "Cannot access before
// initialization" errors.
const { mockSetDocument, mockSetCollaborators, mockSubscribeUnsub, storeHook } =
  vi.hoisted(() => {
    const mockSetDocument = vi.fn();
    const mockSetCollaborators = vi.fn();
    const mockSetCollaborating = vi.fn();
    const mockSubscribeUnsub = vi.fn();
    const mockSubscribe = vi.fn(() => mockSubscribeUnsub);
    const mockGetState = vi.fn(() => ({ isDirty: false, document: null }));
    const mockSetState = vi.fn();
    const storeHook = Object.assign(
      vi.fn((selector: (s: { document: null; setDocument: typeof mockSetDocument; setCollaborators: typeof mockSetCollaborators; setCollaborating: typeof mockSetCollaborating }) => unknown) =>
        selector({ document: null, setDocument: mockSetDocument, setCollaborators: mockSetCollaborators, setCollaborating: mockSetCollaborating })
      ),
      { subscribe: mockSubscribe, getState: mockGetState, setState: mockSetState }
    );
    return { mockSetDocument, mockSetCollaborators, mockSetCollaborating, mockSubscribeUnsub, mockSubscribe, storeHook };
  });

vi.mock("@/features/editor/store/useEditorStore", () => ({
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
      expect.objectContaining({ withCredentials: true })
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

  it("calls setDocument with doc content on am:init", async () => {
    renderHook(() => useRealtimeCollaboration("d1"));

    const doc = Automerge.from(makeEmptyDoc() as unknown as Record<string, unknown>);
    const bytes = Automerge.save(doc);

    const initCall = (mockSocket.on as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => c[0] === "am:init"
    );
    await act(async () => { await (initCall![1] as (b: number[]) => Promise<void>)(Array.from(bytes)); });

    expect(mockSetDocument).toHaveBeenCalledWith(
      expect.objectContaining({ entities: [], format: "erdify.schema.v1" })
    );
  });

  it("calls setDocument on am:change with updated content", async () => {
    renderHook(() => useRealtimeCollaboration("d1"));

    const doc = Automerge.from(makeEmptyDoc() as unknown as Record<string, unknown>);
    const initBytes = Automerge.save(doc);
    const initCall = (mockSocket.on as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => c[0] === "am:init"
    );
    await act(async () => { await (initCall![1] as (b: number[]) => Promise<void>)(Array.from(initBytes)); });

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

    await vi.waitFor(() => expect(mockSetDocument).toHaveBeenLastCalledWith(
      expect.objectContaining({ entities: expect.arrayContaining([expect.objectContaining({ id: "e1" })]) })
    ));
  });

  // #137: 원격 변경마다 문서 전체를 복사·재렌더하면 초당 수백 건에서 탭이 멈췄다
  describe("원격 변경 묶어서 적용", () => {
    const setupJoined = async () => {
      const { unmount } = renderHook(() => useRealtimeCollaboration("d1"));
      const doc = Automerge.from(makeEmptyDoc() as unknown as Record<string, unknown>);
      const initCall = (mockSocket.on as ReturnType<typeof vi.fn>).mock.calls.find(
        (c: unknown[]) => c[0] === "am:init"
      );
      await act(async () => { await (initCall![1] as (b: number[]) => Promise<void>)(Array.from(Automerge.save(doc))); });
      const changeCall = (mockSocket.on as ReturnType<typeof vi.fn>).mock.calls.find(
        (c: unknown[]) => c[0] === "am:change"
      );
      mockSetDocument.mockClear();
      return { doc, unmount, onChange: changeCall![1] as (b: number[]) => void };
    };

    const changesAddingTables = (doc: Automerge.Doc<unknown>, count: number) => {
      const changes: Uint8Array[] = [];
      let current = doc;
      for (let i = 0; i < count; i++) {
        current = Automerge.change(current, (d) => {
          ((d as unknown as DiagramDocument).entities).push({
            id: `e${i}`, name: `T${i}`, logicalName: null, comment: null, color: null, columns: []
          });
        });
        changes.push(Automerge.getLastLocalChange(current)!);
      }
      return changes;
    };

    it("짧은 간격에 들어온 변경은 한 번만 문서를 갱신한다", async () => {
      const { doc, onChange } = await setupJoined();
      const changes = changesAddingTables(doc, 20);

      act(() => { changes.forEach((c) => onChange(Array.from(c))); });

      await vi.waitFor(() => expect(mockSetDocument).toHaveBeenCalledTimes(1));
      const applied = mockSetDocument.mock.calls[0]![0] as DiagramDocument;
      expect(applied.entities).toHaveLength(20);
    });

    it("적용 전에 연결이 끊기면 쌓인 변경을 버린다", async () => {
      const { doc, onChange, unmount } = await setupJoined();
      vi.useFakeTimers();
      try {
        const [change] = changesAddingTables(doc, 1);
        act(() => { onChange(Array.from(change!)); });
        unmount(); // 정리에서 onDisconnect → 쌓인 변경과 타이머를 비운다
        await act(async () => { await vi.advanceTimersByTimeAsync(100); });
        expect(mockSetDocument).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  it("merges a pending local edit into a cloned server doc when isDirty on am:init (no prior am doc)", async () => {
    mockSocket.connected = true;
    const localDoc: DiagramDocument = {
      ...makeEmptyDoc(),
      entities: [{ id: "e-local", name: "Local", logicalName: null, comment: null, color: null, columns: [] }]
    };
    (storeHook.getState as ReturnType<typeof vi.fn>).mockReturnValueOnce({ isDirty: true, document: localDoc });

    renderHook(() => useRealtimeCollaboration("d1"));

    const doc = Automerge.from(makeEmptyDoc() as unknown as Record<string, unknown>);
    const bytes = Automerge.save(doc);
    const initCall = (mockSocket.on as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => c[0] === "am:init"
    );
    await act(async () => { await (initCall![1] as (b: number[]) => Promise<void>)(Array.from(bytes)); });

    // 병합 결과는 서버로 emit되고, 서버가 발신자에게 echo하지 않으므로 로컬 UI에도 직접 반영돼야 한다.
    expect(mockSetDocument).toHaveBeenCalledWith(
      expect.objectContaining({ entities: expect.arrayContaining([expect.objectContaining({ id: "e-local" })]) })
    );
    const changeCall = (mockSocket.emit as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => c[0] === "am:change"
    );
    expect(changeCall).toBeTruthy();

    const [appliedDoc] = Automerge.applyChanges(doc, [Uint8Array.from(changeCall![1] as number[])]);
    expect((appliedDoc as unknown as DiagramDocument).entities).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "e-local" })])
    );
  });

  it("merges a pending local edit into a cloned prior am doc when isDirty on a reconnect am:init", async () => {
    mockSocket.connected = true;
    renderHook(() => useRealtimeCollaboration("d1"));

    const doc = Automerge.from(makeEmptyDoc() as unknown as Record<string, unknown>);
    const bytes = Automerge.save(doc);
    const initCall = (mockSocket.on as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => c[0] === "am:init"
    );

    // First am:init (not dirty) populates amDocRef.current with the server doc.
    await act(async () => { await (initCall![1] as (b: number[]) => Promise<void>)(Array.from(bytes)); });

    // Second am:init (e.g. reconnect) while a local edit is pending — should clone
    // the previously-stored am doc (not the freshly-received serverDoc) as the base.
    const localDoc: DiagramDocument = {
      ...makeEmptyDoc(),
      entities: [{ id: "e-local-2", name: "Local2", logicalName: null, comment: null, color: null, columns: [] }]
    };
    (storeHook.getState as ReturnType<typeof vi.fn>).mockReturnValueOnce({ isDirty: true, document: localDoc });
    await act(async () => { await (initCall![1] as (b: number[]) => Promise<void>)(Array.from(bytes)); });

    const changeCalls = (mockSocket.emit as ReturnType<typeof vi.fn>).mock.calls.filter(
      (c: unknown[]) => c[0] === "am:change"
    );
    expect(changeCalls.length).toBeGreaterThan(0);

    const [, lastChangeBytes] = changeCalls[changeCalls.length - 1] as [string, number[]];
    const [appliedDoc] = Automerge.applyChanges(doc, [Uint8Array.from(lastChangeBytes)]);
    expect((appliedDoc as unknown as DiagramDocument).entities).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "e-local-2" })])
    );
  });

  it("합류 병합 시 상대가 지운 테이블을 부활시키지 않는다 (#111) — baselineDocument를 base로 사용", async () => {
    mockSocket.connected = true;
    renderHook(() => useRealtimeCollaboration("d1"));

    // HTTP로 로드한 문서(e-shared 포함)에서 편집을 시작(isDirty)한 뒤 협업에 합류하는데,
    // 그 사이 상대가 e-shared를 지워 서버 문서에는 없다. 나는 e-shared를 건드리지 않았으므로
    // 병합 결과에 부활시키면 안 된다 — base가 서버 문서면 "내가 추가한 것"으로 오인된다.
    const sharedEntity = { id: "e-shared", name: "Shared", logicalName: null, comment: null, color: null, columns: [] };
    const loadedDoc: DiagramDocument = { ...makeEmptyDoc(), entities: [{ ...sharedEntity }] };
    const localDoc: DiagramDocument = { ...makeEmptyDoc(), entities: [{ ...sharedEntity }] };
    const serverDocDeleted = Automerge.from(makeEmptyDoc() as unknown as Record<string, unknown>);

    (storeHook.getState as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      isDirty: true,
      document: localDoc,
      baselineDocument: loadedDoc,
    });
    const initCall = (mockSocket.on as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => c[0] === "am:init"
    );
    await act(async () => { await (initCall![1] as (b: number[]) => Promise<void>)(Array.from(Automerge.save(serverDocDeleted))); });

    const changeCalls = (mockSocket.emit as ReturnType<typeof vi.fn>).mock.calls.filter(
      (c: unknown[]) => c[0] === "am:change"
    );
    let finalDoc = serverDocDeleted;
    for (const [, bytes] of changeCalls as Array<[string, number[]]>) {
      [finalDoc] = Automerge.applyChanges(finalDoc, [Uint8Array.from(bytes)]);
    }
    expect((finalDoc as unknown as DiagramDocument).entities).toEqual([]);

    // 로컬 UI도 병합 결과로 갱신되어야 한다 — 아니면 부활 방지된 테이블이 화면에 남아
    // 이후 편집이 조용히 유실된다 (서버는 발신자에게 echo하지 않음).
    expect(mockSetDocument).toHaveBeenCalledWith(expect.objectContaining({ entities: [] }));
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
