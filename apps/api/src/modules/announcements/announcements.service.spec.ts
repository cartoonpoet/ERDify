import { NotFoundException } from "@nestjs/common";
import type { Announcement } from "@erdify/db";
import type { Repository } from "typeorm";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AnnouncementsService } from "./announcements.service";

type MockRepo = {
  find: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe("AnnouncementsService", () => {
  let service: AnnouncementsService;
  let repo: MockRepo;

  beforeEach(() => {
    repo = {
      find: vi.fn(),
      findOne: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };
    service = new AnnouncementsService(repo as unknown as Repository<Announcement>);
  });

  describe("findActive", () => {
    it("활성 공지만 반환한다", async () => {
      const now = new Date();
      const active = { id: "1", title: "점검", content: "내용", type: "maintenance", isUrgent: false, startsAt: new Date(now.getTime() - 1000), endsAt: null, createdBy: "u1", createdAt: now, updatedAt: now };
      repo.find.mockResolvedValue([active]);
      const result = await service.findActive();
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("1");
    });
  });

  describe("findAll", () => {
    it("만료된 공지 포함 전체 반환한다", async () => {
      const now = new Date();
      const makeRow = (id: string) => ({ id, title: "t", content: "c", type: "general", isUrgent: false, startsAt: now, endsAt: null, createdBy: "u1", createdAt: now, updatedAt: now });
      repo.find.mockResolvedValue([makeRow("1"), makeRow("2")]);
      const result = await service.findAll();
      expect(result).toHaveLength(2);
      expect(repo.find).toHaveBeenCalledWith({ order: { createdAt: "DESC" } });
    });
  });

  describe("create", () => {
    it("공지를 저장하고 반환한다", async () => {
      const saved = { id: "new-id", title: "제목", content: "내용", type: "feature", isUrgent: false, startsAt: new Date(), endsAt: null, createdBy: "u1", createdAt: new Date(), updatedAt: new Date() };
      repo.save.mockResolvedValue(saved);
      const result = await service.create({ title: "제목", content: "내용", type: "feature", isUrgent: false, startsAt: new Date().toISOString() }, "u1");
      expect(result.title).toBe("제목");
      expect(repo.save).toHaveBeenCalledOnce();
    });
  });

  describe("update", () => {
    it("존재하지 않는 공지 수정 시 NotFoundException", async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.update("bad-id", { title: "수정" })).rejects.toThrow(NotFoundException);
    });

    it("존재하는 공지를 수정한다", async () => {
      const existing = { id: "1", title: "원래", content: "내용", type: "general", isUrgent: false, startsAt: new Date(), endsAt: null, createdBy: "u1", createdAt: new Date(), updatedAt: new Date() };
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockResolvedValue({ ...existing, title: "수정됨" });
      const result = await service.update("1", { title: "수정됨" });
      expect(result.title).toBe("수정됨");
    });
  });

  describe("remove", () => {
    it("존재하지 않는 공지 삭제 시 NotFoundException", async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove("bad-id")).rejects.toThrow(NotFoundException);
    });

    it("공지를 삭제한다", async () => {
      repo.findOne.mockResolvedValue({ id: "1" });
      await service.remove("1");
      expect(repo.delete).toHaveBeenCalledWith("1");
    });
  });
});
