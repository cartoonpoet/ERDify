import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Diagram } from "@erdify/db";
import { NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as Automerge from "@automerge/automerge";
import { CollaborationService } from "./collaboration.service";

const mockDiagramContent = {
  format: "erdify.schema.v1",
  id: "d1",
  name: "Test",
  dialect: "postgresql",
  entities: [],
  relationships: [],
  indexes: [],
  views: [],
  layout: { entityPositions: {} },
  metadata: { revision: 1, stableObjectIds: true, createdAt: "2026-01-01", updatedAt: "2026-01-01" }
};

const mockDiagram = { id: "d1", projectId: "p1", name: "Test", content: mockDiagramContent } as Diagram;

describe("CollaborationService", () => {
  let service: CollaborationService;
  const mockRepo = { findOne: vi.fn(), update: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        CollaborationService,
        { provide: getRepositoryToken(Diagram), useValue: mockRepo },
        { provide: ConfigService, useValue: { get: vi.fn().mockReturnValue(30_000) } },
      ]
    }).compile();
    service = module.get(CollaborationService);
  });

  describe("joinRoom", () => {
    it("throws NotFoundException if diagram not found", async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.joinRoom("d1")).rejects.toThrow(NotFoundException);
    });

    it("creates an Automerge doc room from DB content and returns Uint8Array", async () => {
      mockRepo.findOne.mockResolvedValue(mockDiagram);
      const bytes = await service.joinRoom("d1");
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBeGreaterThan(0);
    });

    it("reuses existing room on second join", async () => {
      mockRepo.findOne.mockResolvedValue(mockDiagram);
      await service.joinRoom("d1");
      await service.joinRoom("d1");
      // repo called only once (room already exists)
      expect(mockRepo.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe("applyChanges", () => {
    it("throws NotFoundException if room does not exist", () => {
      const doc = Automerge.init();
      const changes = Automerge.getAllChanges(doc);
      expect(() => service.applyChanges("nonexistent", changes)).toThrow(NotFoundException);
    });

    it("applies changes and returns the passed changes array", async () => {
      mockRepo.findOne.mockResolvedValue(mockDiagram);
      await service.joinRoom("d1");
      // Build a real Automerge change to apply
      const base = Automerge.init<{ value: string }>();
      const updated = Automerge.change(base, (d) => { d.value = "hello"; });
      const changes = Automerge.getAllChanges(updated);
      const result = service.applyChanges("d1", changes);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(changes.length);
    });
  });

  describe("presence", () => {
    beforeEach(async () => {
      mockRepo.findOne.mockResolvedValue(mockDiagram);
      await service.joinRoom("d1");
    });

    it("getPresence returns empty array when no presence added", () => {
      expect(service.getPresence("d1")).toEqual([]);
    });

    it("addPresence adds collaborator with assigned color", () => {
      service.addPresence("d1", "u1", "socket1", "u1@example.com");
      const presence = service.getPresence("d1");
      expect(presence).toHaveLength(1);
      expect(presence).toMatchObject([{ userId: "u1", socketId: "socket1", selectedEntityId: null, color: expect.stringMatching(/^#/) }]);
    });

    it("updatePresence updates selectedEntityId", () => {
      service.addPresence("d1", "u1", "socket1", "u1@example.com");
      service.updatePresence("d1", "u1", { selectedEntityId: "entity-1" });
      const presence = service.getPresence("d1");
      expect(presence).toMatchObject([{ selectedEntityId: "entity-1" }]);
    });

    it("leaveRoom removes collaborator", async () => {
      mockRepo.update.mockResolvedValue(undefined);
      service.addPresence("d1", "u1", "socket1", "u1@example.com");
      // Add a second user so the room isn't deleted (no persist triggered)
      service.addPresence("d1", "u2", "socket2", "u2@example.com");
      await service.leaveRoom("d1", "socket1");
      expect(service.getPresence("d1")).toHaveLength(1);
    });

    it("leaveRoom deletes the room so re-join queries the DB again", async () => {
      mockRepo.update.mockResolvedValue(undefined);
      service.addPresence("d1", "u1", "socket1", "u1@example.com");
      await service.leaveRoom("d1", "socket1");
      // Room is gone — next joinRoom must hit the DB
      mockRepo.findOne.mockResolvedValue(mockDiagram);
      await service.joinRoom("d1");
      // findOne was called once in beforeEach, once again here after room deletion
      expect(mockRepo.findOne).toHaveBeenCalledTimes(2);
    });

    it("leaveRoom persists before deleting room when last user leaves", async () => {
      mockRepo.update.mockResolvedValue(undefined);
      service.addPresence("d1", "u1", "socket1", "u1@example.com");
      await service.leaveRoom("d1", "socket1");
      expect(mockRepo.update).toHaveBeenCalledWith({ id: "d1" }, expect.objectContaining({ content: expect.any(Object) }));
    });

    // 부하 테스트: 같은 계정으로 탭 2개 → 탭 1 닫기 → 탭 2 편집이 Room not found로 유실됐다
    describe("같은 사용자가 탭 여러 개", () => {
      beforeEach(() => {
        mockRepo.update.mockResolvedValue(undefined);
        service.addPresence("d1", "u1", "tab1", "u1@example.com");
        service.addPresence("d1", "u1", "tab2", "u1@example.com");
      });

      it("presence에는 사용자당 한 번만 보인다", () => {
        expect(service.getPresence("d1")).toHaveLength(1);
      });

      it("탭 하나를 닫아도 방과 presence가 남고, 남은 탭의 편집이 적용된다", async () => {
        await service.leaveRoom("d1", "tab1");

        expect(service.getPresence("d1")).toMatchObject([{ userId: "u1" }]);
        expect(mockRepo.update).not.toHaveBeenCalled();
        const change = Automerge.getAllChanges(Automerge.change(Automerge.init<{ v: number }>(), (d) => { d.v = 1; }));
        expect(() => service.applyChanges("d1", change)).not.toThrow();
      });

      it("마지막 탭이 닫히면 저장하고 방을 정리한다", async () => {
        await service.leaveRoom("d1", "tab1");
        await service.leaveRoom("d1", "tab2");

        expect(service.getPresence("d1")).toEqual([]);
        expect(mockRepo.update).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("persistNow", () => {
    it("saves current Automerge doc content to DB", async () => {
      mockRepo.findOne.mockResolvedValue(mockDiagram);
      mockRepo.update.mockResolvedValue(undefined);
      await service.joinRoom("d1");
      await service.persistNow("d1");
      expect(mockRepo.update).toHaveBeenCalledWith(
        { id: "d1" },
        expect.objectContaining({ content: expect.any(Object) })
      );
    });

    it("does nothing if room does not exist", async () => {
      await service.persistNow("nonexistent");
      expect(mockRepo.update).not.toHaveBeenCalled();
    });
  });

  describe("getRoomPresences", () => {
    it("returns empty arrays for diagramIds with no active room", () => {
      const result = service.getRoomPresences(["no-room-1", "no-room-2"]);
      expect(result).toEqual({ "no-room-1": [], "no-room-2": [] });
    });

    it("returns presence list for active rooms", async () => {
      mockRepo.findOne.mockResolvedValue(mockDiagram);
      await service.joinRoom("d1");
      service.addPresence("d1", "user-1", "socket-1", "kim@example.com");

      const result = service.getRoomPresences(["d1"]);
      const users = result["d1"]!;

      expect(users).toHaveLength(1);
      expect(users[0]).toMatchObject({
        userId: "user-1",
        email: "kim@example.com",
      });
      expect(users[0]!.color).toBeDefined();
    });

    it("mixes empty and populated rooms correctly", async () => {
      mockRepo.findOne.mockResolvedValue(mockDiagram);
      await service.joinRoom("d1");
      service.addPresence("d1", "user-1", "socket-1", "kim@example.com");

      const result = service.getRoomPresences(["d1", "no-room"]);

      expect(result["d1"]).toHaveLength(1);
      expect(result["no-room"]).toEqual([]);
    });
  });

  describe("syncExternalContent", () => {
    const contentWithTable = {
      ...mockDiagramContent,
      entities: [{ id: "e1", name: "users", logicalName: null, comment: null, color: null, columns: [] }],
    };

    it("룸이 없으면 null을 반환하고 아무 것도 하지 않는다", () => {
      expect(service.syncExternalContent("nonexistent", mockDiagramContent as never)).toBeNull();
    });

    // #111 재현: 에디터(룸)가 열린 채 HTTP/MCP로 테이블을 지우면, 룸의 메모리 문서가
    // 다음 persist에서 DB를 덮어써 지운 테이블이 되살아났다. 외부 쓰기를 룸에
    // 동기화하면 persist가 최신 내용을 저장해야 한다.
    it("외부 쓰기 동기화 후 persistNow는 지운 테이블을 되살리지 않는다", async () => {
      mockRepo.findOne.mockResolvedValue({ ...mockDiagram, content: contentWithTable } as Diagram);
      mockRepo.update.mockResolvedValue(undefined);
      await service.joinRoom("d1");

      service.syncExternalContent("d1", mockDiagramContent as never);
      await service.persistNow("d1");

      const persisted = (mockRepo.update.mock.calls[0]![1] as { content: { entities: unknown[] } }).content;
      expect(persisted.entities).toEqual([]);
    });

    it("반환한 change를 다른 피어에 적용하면 같은 내용이 된다", async () => {
      mockRepo.findOne.mockResolvedValue({ ...mockDiagram, content: contentWithTable } as Diagram);
      const initBytes = await service.joinRoom("d1");

      const change = service.syncExternalContent("d1", mockDiagramContent as never);
      expect(change).toBeInstanceOf(Uint8Array);

      const peer = Automerge.load<{ entities: unknown[] }>(initBytes);
      const [peerSynced] = Automerge.applyChanges(peer, [change!]);
      expect(peerSynced.entities).toEqual([]);
    });

    it("내용이 이미 같으면 null을 반환한다 (불필요한 op 방지)", async () => {
      mockRepo.findOne.mockResolvedValue({ ...mockDiagram, content: contentWithTable } as Diagram);
      await service.joinRoom("d1");
      expect(service.syncExternalContent("d1", contentWithTable as never)).toBeNull();
    });
  });

  describe("schedulePersist", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("calls persistNow after 30 seconds", async () => {
      mockRepo.findOne.mockResolvedValue(mockDiagram);
      mockRepo.update.mockResolvedValue(undefined);
      await service.joinRoom("d1");
      service.schedulePersist("d1");
      expect(mockRepo.update).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(30_000);
      expect(mockRepo.update).toHaveBeenCalledTimes(1);
    });

    it("debounces — only persists once for multiple rapid calls", async () => {
      mockRepo.findOne.mockResolvedValue(mockDiagram);
      mockRepo.update.mockResolvedValue(undefined);
      await service.joinRoom("d1");
      service.schedulePersist("d1");
      service.schedulePersist("d1");
      service.schedulePersist("d1");
      await vi.advanceTimersByTimeAsync(30_000);
      expect(mockRepo.update).toHaveBeenCalledTimes(1);
    });

    // 부하 테스트: 1초마다 계속 편집하면 디바운스가 저장을 끝없이 미뤄 DB 저장이 0번이었다
    it("계속 편집해도 첫 미저장 편집 후 30초가 지나면 저장한다", async () => {
      mockRepo.findOne.mockResolvedValue(mockDiagram);
      mockRepo.update.mockResolvedValue(undefined);
      await service.joinRoom("d1");
      for (let i = 0; i < 30; i++) {
        service.schedulePersist("d1");
        await vi.advanceTimersByTimeAsync(1_000);
      }
      expect(mockRepo.update).toHaveBeenCalledTimes(1);
    });

    it("저장 이후의 편집은 다음 주기에 다시 저장한다", async () => {
      mockRepo.findOne.mockResolvedValue(mockDiagram);
      mockRepo.update.mockResolvedValue(undefined);
      await service.joinRoom("d1");
      service.schedulePersist("d1");
      await vi.advanceTimersByTimeAsync(30_000);
      service.schedulePersist("d1");
      await vi.advanceTimersByTimeAsync(30_000);
      expect(mockRepo.update).toHaveBeenCalledTimes(2);
    });

    it("저장이 실패해도 예외를 밖으로 던지지 않고 다음 편집에서 다시 예약한다", async () => {
      mockRepo.findOne.mockResolvedValue(mockDiagram);
      mockRepo.update.mockRejectedValueOnce(new Error("db down")).mockResolvedValue(undefined);
      await service.joinRoom("d1");
      service.schedulePersist("d1");
      await vi.advanceTimersByTimeAsync(30_000);
      service.schedulePersist("d1");
      await vi.advanceTimersByTimeAsync(30_000);
      expect(mockRepo.update).toHaveBeenCalledTimes(2);
    });
  });

  describe("persistAll (종료 시)", () => {
    it("열린 방을 모두 저장한다", async () => {
      mockRepo.findOne
        .mockResolvedValueOnce(mockDiagram)
        .mockResolvedValueOnce({ ...mockDiagram, id: "d2" } as Diagram);
      mockRepo.update.mockResolvedValue(undefined);
      await service.joinRoom("d1");
      await service.joinRoom("d2");

      await service.persistAll();

      expect(mockRepo.update).toHaveBeenCalledWith({ id: "d1" }, expect.anything());
      expect(mockRepo.update).toHaveBeenCalledWith({ id: "d2" }, expect.anything());
    });

    it("종료 중 마지막 사용자가 나가도 방을 지우거나 따로 저장하지 않는다", async () => {
      mockRepo.findOne.mockResolvedValue(mockDiagram);
      mockRepo.update.mockResolvedValue(undefined);
      await service.joinRoom("d1");
      service.addPresence("d1", "u1", "socket1", "u1@example.com");

      const persisted = service.persistAll();
      await service.leaveRoom("d1", "socket1");
      await persisted;

      expect(mockRepo.update).toHaveBeenCalledTimes(1);
    });
  });

  describe("persistNow 순서", () => {
    // 저장이 겹치면 먼저 뜬 스냅샷이 나중에 커밋돼 최신 편집을 덮을 수 있었다
    it("저장이 겹쳐도 스냅샷을 뜬 순서대로 DB에 쓴다", async () => {
      mockRepo.findOne.mockResolvedValue(mockDiagram);
      await service.joinRoom("d1");
      const order: string[] = [];
      let releaseFirst!: () => void;
      mockRepo.update
        .mockImplementationOnce(() => new Promise<void>((r) => { releaseFirst = () => { order.push("first"); r(); }; }))
        .mockImplementationOnce(() => { order.push("second"); return Promise.resolve(); });

      const first = service.persistNow("d1");
      const second = service.persistNow("d1");
      await Promise.resolve();
      expect(mockRepo.update).toHaveBeenCalledTimes(1);
      releaseFirst();
      await Promise.all([first, second]);

      expect(order).toEqual(["first", "second"]);
    });
  });
});
