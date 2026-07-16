import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import { usePresence } from "./usePresence";
import type { RefObject } from "react";
import type { Socket } from "socket.io-client";

const resetStore = () =>
  useEditorStore.setState({ selectedEntityId: null });

const makeMockSocket = (connected = true) => ({
  emit: vi.fn(),
  connected,
  on: vi.fn(),
  off: vi.fn(),
  disconnect: vi.fn(),
});

describe("usePresence", () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  it("selectedEntityId 변경 시 socket.emit('presence:update')를 호출한다", () => {
    const mockSocket = makeMockSocket(true);
    const socketRef = { current: mockSocket } as unknown as RefObject<Socket | null>;

    renderHook(() => usePresence(socketRef));

    act(() => {
      useEditorStore.setState({ selectedEntityId: "entity-1" });
    });

    expect(mockSocket.emit).toHaveBeenCalledWith("presence:update", {
      selectedEntityId: "entity-1",
    });
  });

  it("socket.connected가 false일 때 emit을 호출하지 않는다", () => {
    const mockSocket = makeMockSocket(false);
    const socketRef = { current: mockSocket } as unknown as RefObject<Socket | null>;

    renderHook(() => usePresence(socketRef));

    act(() => {
      useEditorStore.setState({ selectedEntityId: "entity-2" });
    });

    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  it("socketRef.current가 null일 때 emit을 호출하지 않는다", () => {
    const socketRef = { current: null } as unknown as RefObject<Socket | null>;

    renderHook(() => usePresence(socketRef));

    // null socket이어도 에러 없이 상태 변경이 반영되어야 한다
    expect(() => {
      act(() => {
        useEditorStore.setState({ selectedEntityId: "entity-3" });
      });
    }).not.toThrow();
    expect(useEditorStore.getState().selectedEntityId).toBe("entity-3");
  });

  it("selectedEntityId가 동일한 값으로 변경되면 emit을 호출하지 않는다", () => {
    useEditorStore.setState({ selectedEntityId: "entity-same" });

    const mockSocket = makeMockSocket(true);
    const socketRef = { current: mockSocket } as unknown as RefObject<Socket | null>;

    renderHook(() => usePresence(socketRef));

    act(() => {
      // 동일한 값으로 setState (변경 없음)
      useEditorStore.setState({ selectedEntityId: "entity-same" });
    });

    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  it("selectedEntityId를 null로 변경할 때도 emit을 호출한다", () => {
    useEditorStore.setState({ selectedEntityId: "entity-1" });

    const mockSocket = makeMockSocket(true);
    const socketRef = { current: mockSocket } as unknown as RefObject<Socket | null>;

    renderHook(() => usePresence(socketRef));

    act(() => {
      useEditorStore.setState({ selectedEntityId: null });
    });

    expect(mockSocket.emit).toHaveBeenCalledWith("presence:update", {
      selectedEntityId: null,
    });
  });
});
