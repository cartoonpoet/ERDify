import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Test } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { CollaborationGateway } from "./collaboration.gateway";
import { CollaborationService } from "./collaboration.service";
import { DiagramsService } from "../diagrams/diagrams.service";
import type { Socket, Server } from "socket.io";

function makeSocket(overrides: Partial<Record<string, unknown>> = {}): Socket {
  return {
    id: "socket-1",
    data: {},
    handshake: { auth: { token: "Bearer valid-token" } },
    join: vi.fn(),
    emit: vi.fn(),
    to: vi.fn().mockReturnThis(),
    disconnect: vi.fn(),
    ...overrides
  } as unknown as Socket;
}

describe("CollaborationGateway", () => {
  let gateway: CollaborationGateway;
  const mockService = {
    joinRoom: vi.fn(),
    applyChanges: vi.fn(),
    addPresence: vi.fn(),
    updatePresence: vi.fn(),
    leaveRoom: vi.fn(),
    getPresence: vi.fn(),
    schedulePersist: vi.fn(),
    persistNow: vi.fn(),
    syncExternalContent: vi.fn()
  };
  const mockJwt = { verify: vi.fn() };
  const mockDiagramsService = { getDiagramRole: vi.fn() };
  const mockServer = { to: vi.fn().mockReturnThis(), emit: vi.fn() } as unknown as Server;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        CollaborationGateway,
        { provide: CollaborationService, useValue: mockService },
        { provide: JwtService, useValue: mockJwt },
        { provide: DiagramsService, useValue: mockDiagramsService }
      ]
    }).compile();
    gateway = module.get(CollaborationGateway);
    gateway.server = mockServer;
  });

  describe("handleDiagramContentUpdated", () => {
    const content = { id: "d1", entities: [] };

    it("룸 동기화 change가 있으면 룸에 am:change로 브로드캐스트한다", () => {
      const change = new Uint8Array([7, 8, 9]);
      mockService.syncExternalContent.mockReturnValue(change);

      gateway.handleDiagramContentUpdated({ diagramId: "d1", content });

      expect(mockService.syncExternalContent).toHaveBeenCalledWith("d1", content);
      expect(mockServer.to).toHaveBeenCalledWith("d1");
      expect(mockServer.emit).toHaveBeenCalledWith("am:change", [7, 8, 9]);
    });

    it("룸이 없거나 내용이 같으면(null) 브로드캐스트하지 않는다", () => {
      mockService.syncExternalContent.mockReturnValue(null);

      gateway.handleDiagramContentUpdated({ diagramId: "d1", content });

      expect(mockServer.emit).not.toHaveBeenCalled();
    });
  });

  describe("handleConnection", () => {
    it("disconnects if no token provided", async () => {
      const client = makeSocket({ handshake: { auth: {} } });
      gateway.handleConnection(client);
      expect(client.disconnect).toHaveBeenCalled();
    });

    it("disconnects if token is invalid", async () => {
      mockJwt.verify.mockImplementation(() => { throw new Error("invalid"); });
      const client = makeSocket();
      gateway.handleConnection(client);
      expect(client.disconnect).toHaveBeenCalled();
    });

    it("sets userId on client.data when token is valid", async () => {
      mockJwt.verify.mockReturnValue({ sub: "user-1", email: "a@b.com" });
      const client = makeSocket();
      gateway.handleConnection(client);
      expect(client.data.userId).toBe("user-1");
      expect(client.disconnect).not.toHaveBeenCalled();
    });
  });

  describe("handleJoin", () => {
    it("joins socket room, emits am:init, broadcasts presence:state", async () => {
      const docBytes = new Uint8Array([1, 2, 3]);
      mockDiagramsService.getDiagramRole.mockResolvedValue("editor");
      mockService.joinRoom.mockResolvedValue(docBytes);
      mockService.getPresence.mockReturnValue([]);
      const client = makeSocket();
      client.data.userId = "user-1";

      await gateway.handleJoin(client, { diagramId: "d1" });

      expect(client.join).toHaveBeenCalledWith("d1");
      expect(client.data.diagramId).toBe("d1");
      expect(client.emit).toHaveBeenCalledWith("am:init", Array.from(docBytes));
      expect(mockService.addPresence).toHaveBeenCalledWith("d1", "user-1", "socket-1", undefined);
      expect(mockServer.to).toHaveBeenCalledWith("d1");
      expect(mockServer.emit).toHaveBeenCalledWith("presence:state", []);
    });

    it("disconnects if user has no access to diagram", async () => {
      mockDiagramsService.getDiagramRole.mockResolvedValue(null);
      const client = makeSocket();
      client.data.userId = "user-1";

      await gateway.handleJoin(client, { diagramId: "d1" });

      expect(client.emit).toHaveBeenCalledWith("error", { message: "Forbidden" });
      expect(client.disconnect).toHaveBeenCalled();
      expect(client.join).not.toHaveBeenCalled();
      expect(mockService.joinRoom).not.toHaveBeenCalled();
    });
  });

  describe("handleChange", () => {
    it("applies changes, broadcasts am:change to others in room, schedules persist", async () => {
      const change = [1, 2, 3];
      const client = makeSocket();
      client.data = { userId: "user-1", diagramId: "d1" };
      mockDiagramsService.getDiagramRole.mockResolvedValue("editor");

      await gateway.handleChange(client, change);

      expect(mockService.applyChanges).toHaveBeenCalledWith("d1", [Uint8Array.from(change)]);
      expect(client.to).toHaveBeenCalledWith("d1");
      expect(mockService.schedulePersist).toHaveBeenCalledWith("d1");
    });

    // REST 수정은 보기 권한을 막는데 소켓은 멤버인지만 봐서 보기 권한도 편집이 들어갔다(#141)
    describe("보기 권한", () => {
      it("보기 권한의 편집은 반영·전달·저장하지 않고 연결은 유지한다", async () => {
        mockDiagramsService.getDiagramRole.mockResolvedValue("viewer");
        const client = makeSocket();
        client.data = { userId: "user-1", diagramId: "d1" };

        await gateway.handleChange(client, [1, 2, 3]);

        expect(mockService.applyChanges).not.toHaveBeenCalled();
        expect(client.to).not.toHaveBeenCalled();
        expect(mockService.schedulePersist).not.toHaveBeenCalled();
        expect(client.emit).toHaveBeenCalledWith("error", { message: "Forbidden" });
        expect(client.disconnect).not.toHaveBeenCalled();
      });

      it("보기 권한도 입장해서 문서를 받는다", async () => {
        mockDiagramsService.getDiagramRole.mockResolvedValue("viewer");
        mockService.joinRoom.mockResolvedValue(new Uint8Array([1]));
        mockService.getPresence.mockReturnValue([]);
        const client = makeSocket();
        client.data.userId = "user-1";

        await gateway.handleJoin(client, { diagramId: "d1" });

        expect(client.join).toHaveBeenCalledWith("d1");
        expect(client.emit).toHaveBeenCalledWith("am:init", [1]);
        expect(client.disconnect).not.toHaveBeenCalled();
      });

      it("편집 중 보기 권한으로 바뀌면 캐시가 끝난 뒤부터 편집을 버린다", async () => {
        vi.useFakeTimers();
        try {
          mockDiagramsService.getDiagramRole.mockResolvedValue("editor");
          const client = makeSocket();
          client.data = { userId: "user-1", diagramId: "d1" };
          await gateway.handleChange(client, [1]);

          mockDiagramsService.getDiagramRole.mockResolvedValue("viewer");
          vi.advanceTimersByTime(30_001);
          await gateway.handleChange(client, [2]);

          expect(mockService.applyChanges).toHaveBeenCalledTimes(1);
          expect(client.disconnect).not.toHaveBeenCalled();
        } finally {
          vi.useRealTimers();
        }
      });
    });

    // 부하 테스트: 편집마다 DB 권한 확인을 하면 200명 동시 편집에서 전달 지연이 수 초로 늘었다
    describe("권한 확인 캐시", () => {
      beforeEach(() => vi.useFakeTimers());
      afterEach(() => vi.useRealTimers());

      it("입장 때 확인한 권한을 30초 동안 편집에 재사용한다", async () => {
        mockDiagramsService.getDiagramRole.mockResolvedValue("editor");
        mockService.joinRoom.mockResolvedValue(new Uint8Array([1]));
        mockService.getPresence.mockReturnValue([]);
        const client = makeSocket();
        client.data.userId = "user-1";

        await gateway.handleJoin(client, { diagramId: "d1" });
        await gateway.handleChange(client, [1]);
        await gateway.handleChange(client, [2]);

        expect(mockDiagramsService.getDiagramRole).toHaveBeenCalledTimes(1);
        expect(mockService.applyChanges).toHaveBeenCalledTimes(2);
      });

      it("30초가 지나면 다시 확인하고, 권한이 없어졌으면 끊는다", async () => {
        mockDiagramsService.getDiagramRole.mockResolvedValue("editor");
        const client = makeSocket();
        client.data = { userId: "user-1", diagramId: "d1" };
        await gateway.handleChange(client, [1]);

        vi.advanceTimersByTime(30_001);
        mockDiagramsService.getDiagramRole.mockResolvedValue(null);
        await gateway.handleChange(client, [2]);

        expect(mockDiagramsService.getDiagramRole).toHaveBeenCalledTimes(2);
        expect(client.emit).toHaveBeenCalledWith("error", { message: "Forbidden" });
        expect(client.disconnect).toHaveBeenCalled();
        expect(mockService.applyChanges).toHaveBeenCalledTimes(1);
      });

      it("다른 다이어그램 권한 캐시는 재사용하지 않는다", async () => {
        mockDiagramsService.getDiagramRole.mockResolvedValue("editor");
        const client = makeSocket();
        client.data = { userId: "user-1", diagramId: "d1" };
        await gateway.handleChange(client, [1]);

        client.data.diagramId = "d2";
        await gateway.handleChange(client, [2]);

        expect(mockDiagramsService.getDiagramRole).toHaveBeenNthCalledWith(2, "d2", "user-1");
      });
    });
  });

  describe("handlePresenceUpdate", () => {
    it("updates presence and broadcasts presence:state to all in room", async () => {
      mockService.getPresence.mockReturnValue([]);
      const client = makeSocket();
      client.data = { userId: "user-1", diagramId: "d1" };

      await gateway.handlePresenceUpdate(client, { selectedEntityId: "e1" });

      expect(mockService.updatePresence).toHaveBeenCalledWith("d1", "user-1", { selectedEntityId: "e1" });
      expect(mockServer.to).toHaveBeenCalledWith("d1");
      expect(mockServer.emit).toHaveBeenCalledWith("presence:state", []);
    });
  });

  describe("handleDisconnect", () => {
    it("leaves room and broadcasts updated presence", async () => {
      mockService.leaveRoom.mockResolvedValue(undefined);
      mockService.getPresence.mockReturnValue([]);
      const client = makeSocket();
      client.data = { userId: "user-1", diagramId: "d1" };

      await gateway.handleDisconnect(client);

      expect(mockService.leaveRoom).toHaveBeenCalledWith("d1", "user-1");
      expect(mockServer.to).toHaveBeenCalledWith("d1");
      expect(mockServer.emit).toHaveBeenCalledWith("presence:state", []);
    });

    it("does nothing if client never joined a diagram", async () => {
      const client = makeSocket();
      client.data = {};
      await gateway.handleDisconnect(client);
      expect(mockService.leaveRoom).not.toHaveBeenCalled();
    });
  });
});
