import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emitChange, useCollaborationSocket } from "./useCollaborationSocket";
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
import type { Socket } from "socket.io-client";

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

    expect(mockSocket.emit).toHaveBeenCalledWith("join", { diagramId: "diagram-1", encoding: "base64" });
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
    initHandler([1, 2, 3]);

    expect(handlers.onInit).toHaveBeenCalledWith(Uint8Array.from([1, 2, 3]));
  });

  it("am:change 이벤트 핸들러가 onChange를 호출한다", () => {
    const handlers = makeHandlers();
    renderHook(() => useCollaborationSocket("diagram-1", handlers));

    const changeCall = mockSocket.on.mock.calls.find(([event]) => event === "am:change");
    expect(changeCall).toBeDefined();

    const changeHandler = changeCall![1] as (change: number[]) => void;
    changeHandler([4, 5, 6]);

    expect(handlers.onChange).toHaveBeenCalledWith(Uint8Array.from([4, 5, 6]));
  });

  // 숫자 배열(JSON)은 원래 크기의 약 3.6배라 base64로 받는다. 예전 서버의 숫자 배열도 받아야 한다(#143)
  it("base64로 받은 문서·변경도 Uint8Array로 넘긴다", () => {
    const handlers = makeHandlers();
    renderHook(() => useCollaborationSocket("diagram-1", handlers));
    const handlerOf = (name: string) => mockSocket.on.mock.calls.find(([event]) => event === name)![1] as (p: unknown) => void;

    handlerOf("am:init")("AQID");
    handlerOf("am:change")("BwgJ");

    expect(handlers.onInit).toHaveBeenCalledWith(Uint8Array.from([1, 2, 3]));
    expect(handlers.onChange).toHaveBeenCalledWith(Uint8Array.from([7, 8, 9]));
  });

  it("emitChange는 am:init을 base64로 준 서버에만 base64로, 아니면 숫자 배열로 보낸다", () => {
    renderHook(() => useCollaborationSocket("diagram-1", makeHandlers()));
    const init = mockSocket.on.mock.calls.find(([event]) => event === "am:init")![1] as (p: unknown) => void;
    const socket = mockSocket as unknown as Socket;

    init([1]);
    emitChange(socket, Uint8Array.from([7, 8, 9]));
    init("AQ==");
    emitChange(socket, Uint8Array.from([7, 8, 9]));

    expect(mockSocket.emit).toHaveBeenCalledWith("am:change", [7, 8, 9]);
    expect(mockSocket.emit).toHaveBeenCalledWith("am:change", "BwgJ");
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
