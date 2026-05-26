import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCollaborationSocket } from "./useCollaborationSocket";
import type { CollaborationSocketHandlers } from "./useCollaborationSocket";

const mockSocket = {
  on: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
  off: vi.fn(),
  connected: true,
};

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => mockSocket),
}));

import { io } from "socket.io-client";

const makeHandlers = (): CollaborationSocketHandlers => ({
  onInit: vi.fn(),
  onChange: vi.fn(),
  onPresenceState: vi.fn(),
  onOutgoingChange: vi.fn(() => vi.fn()),
  onDisconnect: vi.fn(),
});

describe("useCollaborationSocket", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("diagramId가 있을 때 io()를 호출하여 소켓을 생성한다", () => {
    const handlers = makeHandlers();
    renderHook(() => useCollaborationSocket("diagram-1", handlers));

    expect(io).toHaveBeenCalledTimes(1);
    expect(vi.mocked(io).mock.calls[0]![0]).toMatch(/\/collaboration$/);
  });

  it("connect 이벤트 핸들러가 등록되고 join을 emit한다", () => {
    const handlers = makeHandlers();
    renderHook(() => useCollaborationSocket("diagram-1", handlers));

    // socket.on이 "connect"로 등록되었는지 확인
    const connectCall = mockSocket.on.mock.calls.find(([event]) => event === "connect");
    expect(connectCall).toBeDefined();

    // connect 콜백을 직접 호출하여 join emit 검증
    const connectHandler = connectCall![1] as () => void;
    connectHandler();

    expect(mockSocket.emit).toHaveBeenCalledWith("join", { diagramId: "diagram-1" });
  });

  it("am:init, am:change, presence:state 이벤트 핸들러가 등록된다", () => {
    const handlers = makeHandlers();
    renderHook(() => useCollaborationSocket("diagram-1", handlers));

    const registeredEvents = mockSocket.on.mock.calls.map(([event]) => event);
    expect(registeredEvents).toContain("am:init");
    expect(registeredEvents).toContain("am:change");
    expect(registeredEvents).toContain("presence:state");
  });

  it("am:init 이벤트 핸들러가 onInit을 호출한다", () => {
    const handlers = makeHandlers();
    renderHook(() => useCollaborationSocket("diagram-1", handlers));

    const initCall = mockSocket.on.mock.calls.find(([event]) => event === "am:init");
    expect(initCall).toBeDefined();

    const initHandler = initCall![1] as (bytes: number[]) => void;
    const bytes = [1, 2, 3];
    initHandler(bytes);

    expect(handlers.onInit).toHaveBeenCalledWith(bytes);
  });

  it("am:change 이벤트 핸들러가 onChange를 호출한다", () => {
    const handlers = makeHandlers();
    renderHook(() => useCollaborationSocket("diagram-1", handlers));

    const changeCall = mockSocket.on.mock.calls.find(([event]) => event === "am:change");
    expect(changeCall).toBeDefined();

    const changeHandler = changeCall![1] as (change: number[]) => void;
    const change = [4, 5, 6];
    changeHandler(change);

    expect(handlers.onChange).toHaveBeenCalledWith(change);
  });

  it("presence:state 이벤트 핸들러가 onPresenceState를 호출한다", () => {
    const handlers = makeHandlers();
    renderHook(() => useCollaborationSocket("diagram-1", handlers));

    const presenceCall = mockSocket.on.mock.calls.find(([event]) => event === "presence:state");
    expect(presenceCall).toBeDefined();

    const presenceHandler = presenceCall![1] as (presence: unknown[]) => void;
    const presence = [{ userId: "u1", selectedEntityId: null }];
    presenceHandler(presence);

    expect(handlers.onPresenceState).toHaveBeenCalledWith(presence);
  });

  it("onOutgoingChange가 소켓을 인수로 호출된다", () => {
    const handlers = makeHandlers();
    renderHook(() => useCollaborationSocket("diagram-1", handlers));

    expect(handlers.onOutgoingChange).toHaveBeenCalledWith(mockSocket);
  });

  it("unmount 시 socket.disconnect()가 호출된다", () => {
    const handlers = makeHandlers();
    const { unmount } = renderHook(() => useCollaborationSocket("diagram-1", handlers));

    act(() => {
      unmount();
    });

    expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);
  });

  it("unmount 시 onDisconnect 콜백이 호출된다", () => {
    const handlers = makeHandlers();
    const { unmount } = renderHook(() => useCollaborationSocket("diagram-1", handlers));

    act(() => {
      unmount();
    });

    expect(handlers.onDisconnect).toHaveBeenCalledTimes(1);
  });

  it("unmount 시 onOutgoingChange가 반환한 cleanup 함수가 호출된다", () => {
    const unsubOutgoing = vi.fn();
    const handlers = makeHandlers();
    vi.mocked(handlers.onOutgoingChange).mockReturnValue(unsubOutgoing);

    const { unmount } = renderHook(() => useCollaborationSocket("diagram-1", handlers));

    act(() => {
      unmount();
    });

    expect(unsubOutgoing).toHaveBeenCalledTimes(1);
  });

  it("diagramId가 빈 문자열일 때 io()를 호출하지 않는다", () => {
    const handlers = makeHandlers();
    renderHook(() => useCollaborationSocket("", handlers));

    expect(io).not.toHaveBeenCalled();
  });

  it("소켓 ref를 반환하고 diagramId 있을 때 소켓 객체를 가리킨다", () => {
    const handlers = makeHandlers();
    const { result } = renderHook(() => useCollaborationSocket("diagram-1", handlers));

    expect(result.current.current).toBe(mockSocket);
  });
});
