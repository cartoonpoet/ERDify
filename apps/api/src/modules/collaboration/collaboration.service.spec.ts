import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Diagram } from "@erdify/db";
import { NotFoundException } from "@nestjs/common";
import * as Y from "yjs";
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
        { provide: getRepositoryToken(Diagram), useValue: mockRepo }
      ]
    }).compile();
    service = module.get(CollaborationService);
  });

  describe("joinRoom", () => {
    it("throws NotFoundException if diagram not found", async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.joinRoom("d1")).rejects.toThrow(NotFoundException);
    });

    it("creates a Y.Doc room from DB content and returns Uint8Array", async () => {
      mockRepo.findOne.mockResolvedValue(mockDiagram);
      const update = await service.joinRoom("d1");
      expect(update).toBeInstanceOf(Uint8Array);
      expect(update.length).toBeGreaterThan(0);
    });

    it("reuses existing room on second join", async () => {
      mockRepo.findOne.mockResolvedValue(mockDiagram);
      await service.joinRoom("d1");
      await service.joinRoom("d1");
      // repo called only once (room already exists)
      expect(mockRepo.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe("applyUpdate", () => {
    it("throws NotFoundException if room does not exist", async () => {
      const fakeUpdate = new Uint8Array([1, 2, 3]);
      await expect(service.applyUpdate("nonexistent", fakeUpdate)).rejects.toThrow(NotFoundException);
    });

    it("applies update and returns Uint8Array", async () => {
      mockRepo.findOne.mockResolvedValue(mockDiagram);
      await service.joinRoom("d1");
      // Create a valid Yjs update by encoding the state of a fresh Y.Doc
      const tmpDoc = new Y.Doc();
      const validUpdate = Y.encodeStateAsUpdate(tmpDoc);
      const result = await service.applyUpdate("d1", validUpdate);
      expect(result).toBeInstanceOf(Uint8Array);
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
      service.addPresence("d1", "u1", "socket1");
      const presence = service.getPresence("d1");
      expect(presence).toHaveLength(1);
      expect(presence).toMatchObject([{ userId: "u1", socketId: "socket1", selectedEntityId: null, color: expect.stringMatching(/^#/) }]);
    });

    it("updatePresence updates selectedEntityId", () => {
      service.addPresence("d1", "u1", "socket1");
      service.updatePresence("d1", "u1", { selectedEntityId: "entity-1" });
      const presence = service.getPresence("d1");
      expect(presence).toMatchObject([{ selectedEntityId: "entity-1" }]);
    });

    it("leaveRoom removes collaborator", async () => {
      mockRepo.update.mockResolvedValue(undefined);
      service.addPresence("d1", "u1", "socket1");
      // Add a second user so the room isn't deleted (no persist triggered)
      service.addPresence("d1", "u2", "socket2");
      await service.leaveRoom("d1", "u1");
      expect(service.getPresence("d1")).toHaveLength(1);
    });

    it("leaveRoom deletes the room so re-join queries the DB again", async () => {
      mockRepo.update.mockResolvedValue(undefined);
      service.addPresence("d1", "u1", "socket1");
      await service.leaveRoom("d1", "u1");
      // Room is gone — next joinRoom must hit the DB
      mockRepo.findOne.mockResolvedValue(mockDiagram);
      await service.joinRoom("d1");
      // findOne was called once in beforeEach, once again here after room deletion
      expect(mockRepo.findOne).toHaveBeenCalledTimes(2);
    });

    it("leaveRoom persists before deleting room when last user leaves", async () => {
      mockRepo.update.mockResolvedValue(undefined);
      service.addPresence("d1", "u1", "socket1");
      await service.leaveRoom("d1", "u1");
      expect(mockRepo.update).toHaveBeenCalledWith({ id: "d1" }, expect.objectContaining({ content: expect.any(Object) }));
    });
  });

  describe("persistNow", () => {
    it("saves current Y.Doc content to DB", async () => {
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
  });
});
