import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { OrganizationAiSettings, AiConversation, Diagram, OrganizationMember } from "@erdify/db";
import { AiService } from "./ai.service";
import { AiHistoryService } from "./ai-history.service";

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn(),
    },
  })),
}));

const makeRepo = (overrides: Record<string, unknown> = {}) => ({
  findOne: vi.fn(),
  find: vi.fn(),
  save: vi.fn(),
  create: vi.fn((v: unknown) => v),
  update: vi.fn(),
  delete: vi.fn(),
  createQueryBuilder: vi.fn(),
  ...overrides,
});

describe("AiService", () => {
  let service: AiService;
  let settingsRepo: ReturnType<typeof makeRepo>;
  let diagramRepo: ReturnType<typeof makeRepo>;
  let memberRepo: ReturnType<typeof makeRepo>;
  let historyService: {
    findRecent: ReturnType<typeof vi.fn>;
    saveUserMessage: ReturnType<typeof vi.fn>;
    saveAssistantMessage: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    settingsRepo = makeRepo();
    diagramRepo = makeRepo();
    memberRepo = makeRepo();
    historyService = {
      findRecent: vi.fn().mockResolvedValue([]),
      saveUserMessage: vi.fn().mockResolvedValue({ id: "msg-u1" }),
      saveAssistantMessage: vi.fn().mockResolvedValue({ id: "msg-a1", content: "Done." }),
    };

    const module = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: getRepositoryToken(OrganizationAiSettings), useValue: settingsRepo },
        { provide: getRepositoryToken(Diagram), useValue: diagramRepo },
        { provide: getRepositoryToken(OrganizationMember), useValue: memberRepo },
        { provide: AiHistoryService, useValue: historyService },
      ],
    }).compile();

    service = module.get(AiService);
  });

  describe("getOrgAiSettings", () => {
    it("멤버가 아니면 ForbiddenException을 던진다", async () => {
      memberRepo.findOne.mockResolvedValue(null);
      await expect(service.getOrgAiSettings("org-1", "user-1")).rejects.toThrow(ForbiddenException);
    });

    it("API 키가 없으면 hasApiKey=false를 반환한다", async () => {
      memberRepo.findOne.mockResolvedValue({ userId: "user-1", organizationId: "org-1", role: "editor" });
      settingsRepo.findOne.mockResolvedValue(null);
      const result = await service.getOrgAiSettings("org-1", "user-1");
      expect(result).toEqual({ organizationId: "org-1", hasApiKey: false });
    });

    it("API 키가 있으면 hasApiKey=true를 반환한다", async () => {
      memberRepo.findOne.mockResolvedValue({ userId: "user-1", organizationId: "org-1", role: "editor" });
      settingsRepo.findOne.mockResolvedValue({ encryptedApiKey: "iv:encrypted" });
      const result = await service.getOrgAiSettings("org-1", "user-1");
      expect(result.hasApiKey).toBe(true);
    });
  });

  describe("updateOrgAiSettings", () => {
    it("owner가 아니면 ForbiddenException을 던진다", async () => {
      memberRepo.findOne.mockResolvedValue({ userId: "user-1", organizationId: "org-1", role: "editor" });
      await expect(service.updateOrgAiSettings("org-1", "user-1", "sk-ant-xxx", "anthropic")).rejects.toThrow(ForbiddenException);
    });

    it("멤버가 없으면 ForbiddenException을 던진다", async () => {
      memberRepo.findOne.mockResolvedValue(null);
      await expect(service.updateOrgAiSettings("org-1", "user-1", "sk-ant-xxx", "anthropic")).rejects.toThrow(ForbiddenException);
    });

    it("owner이면 API 키를 암호화해서 저장한다 (신규)", async () => {
      memberRepo.findOne.mockResolvedValue({ userId: "user-1", organizationId: "org-1", role: "owner" });
      settingsRepo.findOne.mockResolvedValue(null);
      settingsRepo.save.mockResolvedValue({});
      await expect(service.updateOrgAiSettings("org-1", "user-1", "sk-ant-xxx", "anthropic")).resolves.toBeUndefined();
      expect(settingsRepo.save).toHaveBeenCalled();
      const savedArg = (settingsRepo.save.mock.calls[0] as [{ encryptedApiKey: string }])[0];
      expect(savedArg.encryptedApiKey).not.toBe("sk-ant-xxx");
      expect(typeof savedArg.encryptedApiKey).toBe("string");
    });

    it("기존 설정이 있으면 update를 호출한다", async () => {
      memberRepo.findOne.mockResolvedValue({ userId: "user-1", organizationId: "org-1", role: "owner" });
      settingsRepo.findOne.mockResolvedValue({ id: "setting-1", encryptedApiKey: "old" });
      settingsRepo.update.mockResolvedValue({});
      await expect(service.updateOrgAiSettings("org-1", "user-1", "sk-ant-new", "anthropic")).resolves.toBeUndefined();
      expect(settingsRepo.update).toHaveBeenCalled();
      expect(settingsRepo.save).not.toHaveBeenCalled();
    });
  });
});
