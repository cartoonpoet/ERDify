import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenException } from "@nestjs/common";
import { OrganizationAiSettings, Diagram, OrganizationMember } from "@erdify/db";
import { AiService } from "./ai.service";
import { UsageService } from "../usage/usage.service";
import { encrypt } from "../../common/utils/field-cipher";

let anthropicCreateMock: ReturnType<typeof vi.fn>;

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: (...args: unknown[]) => anthropicCreateMock(...args),
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

  beforeEach(async () => {
    anthropicCreateMock = vi.fn();
    settingsRepo = makeRepo();
    diagramRepo = makeRepo();
    memberRepo = makeRepo();

    const module = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: getRepositoryToken(OrganizationAiSettings), useValue: settingsRepo },
        { provide: getRepositoryToken(Diagram), useValue: diagramRepo },
        { provide: getRepositoryToken(OrganizationMember), useValue: memberRepo },
        { provide: UsageService, useValue: { log: vi.fn().mockResolvedValue(undefined) } },
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
      expect(result).toEqual({ organizationId: "org-1", hasApiKey: false, provider: "anthropic", model: "" });
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
      await expect(service.updateOrgAiSettings("org-1", "user-1", "sk-ant-xxx", "anthropic", "")).rejects.toThrow(ForbiddenException);
    });

    it("멤버가 없으면 ForbiddenException을 던진다", async () => {
      memberRepo.findOne.mockResolvedValue(null);
      await expect(service.updateOrgAiSettings("org-1", "user-1", "sk-ant-xxx", "anthropic", "")).rejects.toThrow(ForbiddenException);
    });

    it("owner이면 API 키를 암호화해서 저장한다 (신규)", async () => {
      memberRepo.findOne.mockResolvedValue({ userId: "user-1", organizationId: "org-1", role: "owner" });
      settingsRepo.findOne.mockResolvedValue(null);
      settingsRepo.save.mockResolvedValue({});
      await expect(service.updateOrgAiSettings("org-1", "user-1", "sk-ant-xxx", "anthropic", "")).resolves.toBeUndefined();
      expect(settingsRepo.save).toHaveBeenCalled();
      const savedArg = (settingsRepo.save.mock.calls[0] as [{ encryptedApiKey: string }])[0];
      expect(savedArg.encryptedApiKey).not.toBe("sk-ant-xxx");
      expect(typeof savedArg.encryptedApiKey).toBe("string");
    });

    it("기존 설정이 있으면 update를 호출한다", async () => {
      memberRepo.findOne.mockResolvedValue({ userId: "user-1", organizationId: "org-1", role: "owner" });
      settingsRepo.findOne.mockResolvedValue({ id: "setting-1", encryptedApiKey: "old" });
      settingsRepo.update.mockResolvedValue({});
      await expect(service.updateOrgAiSettings("org-1", "user-1", "sk-ant-new", "anthropic", "")).resolves.toBeUndefined();
      expect(settingsRepo.update).toHaveBeenCalled();
      expect(settingsRepo.save).not.toHaveBeenCalled();
    });
  });

  describe("suggestColumns()", () => {
    it("Anthropic 응답에서 JSON 배열을 파싱해서 반환한다", async () => {
      memberRepo.findOne.mockResolvedValue({ userId: "user-1", organizationId: "org-1", role: "editor" });
      settingsRepo.findOne.mockResolvedValue({
        encryptedApiKey: encrypt("sk-ant-key"),
        provider: "anthropic",
        model: "claude-sonnet-4-6",
      });

      const suggestions = [
        { name: "id", type: "uuid", nullable: false, pk: true },
        { name: "created_at", type: "timestamptz", nullable: false, pk: false },
      ];
      anthropicCreateMock.mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify(suggestions) }],
      });

      const result = await service.suggestColumns("user-1", "users", ["email"]);
      expect(result).toEqual(suggestions);
    });

    it("응답이 유효하지 않은 JSON이면 빈 배열을 반환한다", async () => {
      memberRepo.findOne.mockResolvedValue({ userId: "user-1", organizationId: "org-1", role: "editor" });
      settingsRepo.findOne.mockResolvedValue({
        encryptedApiKey: encrypt("sk-ant-key"),
        provider: "anthropic",
        model: "claude-sonnet-4-6",
      });

      anthropicCreateMock.mockResolvedValue({
        content: [{ type: "text", text: "Sure! Here are some columns you might consider..." }],
      });

      const result = await service.suggestColumns("user-1", "users", []);
      expect(result).toEqual([]);
    });

    it("응답에 JSON 배열이 없으면 빈 배열을 반환한다", async () => {
      memberRepo.findOne.mockResolvedValue({ userId: "user-1", organizationId: "org-1", role: "editor" });
      settingsRepo.findOne.mockResolvedValue({
        encryptedApiKey: encrypt("sk-ant-key"),
        provider: "anthropic",
        model: "claude-sonnet-4-6",
      });

      anthropicCreateMock.mockResolvedValue({
        content: [{ type: "text", text: "" }],
      });

      const result = await service.suggestColumns("user-1", "orders", ["id"]);
      expect(result).toEqual([]);
    });

    it("조직 멤버십이 없으면 ForbiddenException을 던진다", async () => {
      memberRepo.findOne.mockResolvedValue(null);
      await expect(service.suggestColumns("user-1", "users", [])).rejects.toThrow(ForbiddenException);
    });

    it("응답 텍스트에 설명이 섞여 있어도 JSON 배열 부분만 파싱한다", async () => {
      memberRepo.findOne.mockResolvedValue({ userId: "user-1", organizationId: "org-1", role: "editor" });
      settingsRepo.findOne.mockResolvedValue({
        encryptedApiKey: encrypt("sk-ant-key"),
        provider: "anthropic",
        model: "claude-sonnet-4-6",
      });

      const suggestions = [{ name: "email", type: "varchar", nullable: false, pk: false }];
      anthropicCreateMock.mockResolvedValue({
        content: [{ type: "text", text: `Here are suggestions:\n${JSON.stringify(suggestions)}\nHope that helps!` }],
      });

      const result = await service.suggestColumns("user-1", "users", []);
      expect(result).toEqual(suggestions);
    });
  });
});
