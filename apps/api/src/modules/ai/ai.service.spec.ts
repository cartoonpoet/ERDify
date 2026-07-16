import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenException } from "@nestjs/common";
import { OrganizationAiSettings, Diagram, OrganizationMember } from "@erdify/db";
import { AiService } from "./ai.service";
import { UsageService } from "../usage/usage.service";
import { encrypt } from "../../common/utils/field-cipher";

let anthropicCreateMock: ReturnType<typeof vi.fn>;
let openaiCreateMock: ReturnType<typeof vi.fn>;
let geminiGenerateMock: ReturnType<typeof vi.fn>;

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: (...args: unknown[]) => anthropicCreateMock(...args) },
  })),
}));

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: (...args: unknown[]) => openaiCreateMock(...args) } },
  })),
}));

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn(() => ({ generateContent: (...args: unknown[]) => geminiGenerateMock(...args) })),
  })),
}));

const makeRepo = (overrides: Record<string, unknown> = {}) => ({
  findOne: vi.fn(),
  find: vi.fn(),
  save: vi.fn((v: unknown) => v),
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
    openaiCreateMock = vi.fn();
    geminiGenerateMock = vi.fn();
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
    it("멤버가 아니면 ForbiddenException", async () => {
      memberRepo.findOne.mockResolvedValue(null);
      await expect(service.getOrgAiSettings("org-1", "user-1")).rejects.toThrow(ForbiddenException);
    });

    it("등록된 provider 여부와 enabledModels를 반환한다", async () => {
      memberRepo.findOne.mockResolvedValue({ userId: "user-1", organizationId: "org-1", role: "editor" });
      settingsRepo.findOne.mockResolvedValue({ providerKeys: { anthropic: "iv:x", openai: "iv:y" }, enabledModels: ["gpt-4o"] });
      const result = await service.getOrgAiSettings("org-1", "user-1");
      expect(result).toEqual({
        organizationId: "org-1",
        providers: { anthropic: true, openai: true, gemini: false },
        enabledModels: ["gpt-4o"],
      });
    });

    it("설정이 없으면 모든 provider false", async () => {
      memberRepo.findOne.mockResolvedValue({ userId: "user-1", organizationId: "org-1", role: "editor" });
      settingsRepo.findOne.mockResolvedValue(null);
      const result = await service.getOrgAiSettings("org-1", "user-1");
      expect(result.providers).toEqual({ anthropic: false, openai: false, gemini: false });
      expect(result.enabledModels).toEqual([]);
    });
  });

  describe("setOrgProviderKey", () => {
    it("owner가 아니면 ForbiddenException", async () => {
      memberRepo.findOne.mockResolvedValue({ role: "editor" });
      await expect(service.setOrgProviderKey("org-1", "user-1", "openai", "sk-x")).rejects.toThrow(ForbiddenException);
    });

    it("owner면 키를 암호화해 providerKeys에 저장한다", async () => {
      memberRepo.findOne.mockResolvedValue({ role: "owner" });
      settingsRepo.findOne.mockResolvedValue({ id: "s1", organizationId: "org-1", providerKeys: { anthropic: "iv:a" }, enabledModels: [] });
      await service.setOrgProviderKey("org-1", "user-1", "openai", "sk-openai");
      const saved = settingsRepo.save.mock.calls[0]![0] as { providerKeys: Record<string, string> };
      expect(saved.providerKeys["anthropic"]).toBe("iv:a"); // 기존 키 유지
      expect(saved.providerKeys["openai"]).toBeDefined();
      expect(saved.providerKeys["openai"]).not.toBe("sk-openai"); // 암호화됨
    });
  });

  describe("removeOrgProviderKey", () => {
    it("owner면 해당 provider 키를 제거한다", async () => {
      memberRepo.findOne.mockResolvedValue({ role: "owner" });
      settingsRepo.findOne.mockResolvedValue({ id: "s1", providerKeys: { anthropic: "iv:a", openai: "iv:o" }, enabledModels: [] });
      await service.removeOrgProviderKey("org-1", "user-1", "openai");
      const saved = settingsRepo.save.mock.calls[0]![0] as { providerKeys: Record<string, string> };
      expect(saved.providerKeys).toEqual({ anthropic: "iv:a" });
    });
  });

  describe("setEnabledModels", () => {
    it("owner면 유효한 모델만 저장한다", async () => {
      memberRepo.findOne.mockResolvedValue({ role: "owner" });
      settingsRepo.findOne.mockResolvedValue({ id: "s1", providerKeys: {}, enabledModels: [] });
      await service.setEnabledModels("org-1", "user-1", ["gpt-4o", "not-a-real-model", "claude-sonnet-4-6"]);
      const saved = settingsRepo.save.mock.calls[0]![0] as { enabledModels: string[] };
      expect(saved.enabledModels).toEqual(["gpt-4o", "claude-sonnet-4-6"]);
    });
  });

  describe("getDiagramAiConfig", () => {
    it("등록된 provider의 (허용된) 모델 목록을 반환한다", async () => {
      diagramRepo.createQueryBuilder.mockReturnValue({
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        getRawOne: vi.fn().mockResolvedValue({ content: {}, name: "d", org_id: "org-1" }),
      });
      memberRepo.findOne.mockResolvedValue({ role: "editor" });
      settingsRepo.findOne.mockResolvedValue({ providerKeys: { openai: "iv:o" }, enabledModels: ["gpt-4o"] });

      const config = await service.getDiagramAiConfig("user-1", "diag-1");
      expect(config.models).toEqual([{ provider: "openai", value: "gpt-4o", label: "GPT-4o (권장)" }]);
    });
  });

  describe("suggestColumns()", () => {
    const setup = () => {
      memberRepo.findOne.mockResolvedValue({ userId: "user-1", organizationId: "org-1", role: "editor" });
      settingsRepo.findOne.mockResolvedValue({ providerKeys: { anthropic: encrypt("sk-ant-key") }, enabledModels: [] });
    };

    it("Anthropic 응답에서 JSON 배열을 파싱한다", async () => {
      setup();
      const suggestions = [{ name: "id", type: "uuid", nullable: false, pk: true }];
      anthropicCreateMock.mockResolvedValue({ content: [{ type: "text", text: JSON.stringify(suggestions) }] });
      const result = await service.suggestColumns("user-1", "users", ["email"]);
      expect(result).toEqual(suggestions);
    });

    it("설명 텍스트에 둘러싸인 JSON 배열도 추출해 파싱한다", async () => {
      setup();
      const suggestions = [{ name: "id", type: "uuid", nullable: false, pk: true }];
      anthropicCreateMock.mockResolvedValue({
        content: [{ type: "text", text: `다음 컬럼을 추천합니다:\n${JSON.stringify(suggestions)}\n참고하세요.` }],
      });
      const result = await service.suggestColumns("user-1", "users", []);
      expect(result).toEqual(suggestions);
    });

    it("유효하지 않은 JSON이면 빈 배열", async () => {
      setup();
      anthropicCreateMock.mockResolvedValue({ content: [{ type: "text", text: "설명만 있음" }] });
      expect(await service.suggestColumns("user-1", "users", [])).toEqual([]);
    });

    it("조직 멤버십이 없으면 ForbiddenException", async () => {
      memberRepo.findOne.mockResolvedValue(null);
      await expect(service.suggestColumns("user-1", "users", [])).rejects.toThrow(ForbiddenException);
    });

    it("AI 키가 하나도 없으면 ForbiddenException", async () => {
      memberRepo.findOne.mockResolvedValue({ userId: "user-1", organizationId: "org-1", role: "editor" });
      settingsRepo.findOne.mockResolvedValue({ providerKeys: {}, enabledModels: [] });
      await expect(service.suggestColumns("user-1", "users", [])).rejects.toThrow(ForbiddenException);
    });

    it("대괄호는 있지만 JSON이 아니면 빈 배열", async () => {
      setup();
      anthropicCreateMock.mockResolvedValue({ content: [{ type: "text", text: "[유효한 JSON이 아닌 텍스트]" }] });
      expect(await service.suggestColumns("user-1", "users", [])).toEqual([]);
    });

    it("OpenAI 키만 있으면 OpenAI SDK(chat.completions)로 호출한다", async () => {
      memberRepo.findOne.mockResolvedValue({ userId: "user-1", organizationId: "org-1", role: "editor" });
      settingsRepo.findOne.mockResolvedValue({ providerKeys: { openai: encrypt("sk-openai") }, enabledModels: [] });
      const suggestions = [{ name: "id", type: "uuid", nullable: false, pk: true }];
      openaiCreateMock.mockResolvedValue({ choices: [{ message: { content: JSON.stringify(suggestions) } }] });

      const result = await service.suggestColumns("user-1", "users", []);

      expect(result).toEqual(suggestions);
      const req = openaiCreateMock.mock.calls[0]![0] as Record<string, unknown>;
      expect(req["model"]).toBe("gpt-4o"); // 첫 허용 OpenAI 모델
      expect(req["max_tokens"]).toBe(512);
    });

    it("gpt-5 계열 모델이면 max_completion_tokens로 호출한다", async () => {
      memberRepo.findOne.mockResolvedValue({ userId: "user-1", organizationId: "org-1", role: "editor" });
      settingsRepo.findOne.mockResolvedValue({ providerKeys: { openai: encrypt("sk-openai") }, enabledModels: ["gpt-5.5"] });
      openaiCreateMock.mockResolvedValue({ choices: [] }); // content 없음 → "" → 빈 배열

      const result = await service.suggestColumns("user-1", "users", []);

      expect(result).toEqual([]);
      const req = openaiCreateMock.mock.calls[0]![0] as Record<string, unknown>;
      expect(req["model"]).toBe("gpt-5.5");
      expect(req["max_completion_tokens"]).toBe(512);
      expect(req).not.toHaveProperty("max_tokens");
    });

    it("Gemini 키만 있으면 Gemini SDK(generateContent)로 호출한다", async () => {
      memberRepo.findOne.mockResolvedValue({ userId: "user-1", organizationId: "org-1", role: "editor" });
      settingsRepo.findOne.mockResolvedValue({ providerKeys: { gemini: encrypt("gm-key") }, enabledModels: [] });
      const suggestions = [{ name: "created_at", type: "timestamptz", nullable: false, pk: false }];
      geminiGenerateMock.mockResolvedValue({ response: { text: () => JSON.stringify(suggestions) } });

      const result = await service.suggestColumns("user-1", "users", []);

      expect(result).toEqual(suggestions);
      const req = geminiGenerateMock.mock.calls[0]![0] as { generationConfig: { maxOutputTokens: number } };
      expect(req.generationConfig.maxOutputTokens).toBe(512);
    });
  });

  describe("completeForUser()", () => {
    it("조직 멤버십이 없으면 ForbiddenException", async () => {
      memberRepo.findOne.mockResolvedValue(null);
      await expect(service.completeForUser("user-1", "요약해줘", 256)).rejects.toThrow(ForbiddenException);
    });

    it("조직 키로 단발성 완성을 수행해 텍스트를 반환한다", async () => {
      memberRepo.findOne.mockResolvedValue({ userId: "user-1", organizationId: "org-1", role: "editor" });
      settingsRepo.findOne.mockResolvedValue({ providerKeys: { anthropic: encrypt("sk-ant") }, enabledModels: [] });
      anthropicCreateMock.mockResolvedValue({ content: [{ type: "text", text: "요약 " }, { type: "text", text: "결과" }] });

      const text = await service.completeForUser("user-1", "요약해줘", 256);

      expect(text).toBe("요약 결과");
      const req = anthropicCreateMock.mock.calls[0]![0] as Record<string, unknown>;
      expect(req["max_tokens"]).toBe(256);
    });
  });

  describe("resolveChatCredentials()", () => {
    it("요청 모델이 허용 목록에 있으면 그 모델의 provider 키를 반환한다", async () => {
      memberRepo.findOne.mockResolvedValue({ role: "editor" });
      settingsRepo.findOne.mockResolvedValue({
        providerKeys: { anthropic: encrypt("sk-ant"), openai: encrypt("sk-openai") },
        enabledModels: [],
      });

      const creds = await service.resolveChatCredentials("org-1", "user-1", "gpt-4o");

      expect(creds.provider).toBe("openai");
      expect(creds.model).toBe("gpt-4o");
      expect(creds.apiKey).toBe("sk-openai");
    });

    it("요청 모델이 허용 목록에 없으면 첫 허용 모델로 대체한다", async () => {
      memberRepo.findOne.mockResolvedValue({ role: "editor" });
      settingsRepo.findOne.mockResolvedValue({ providerKeys: { anthropic: encrypt("sk-ant") }, enabledModels: [] });

      const creds = await service.resolveChatCredentials("org-1", "user-1", "gpt-4o"); // openai 키 없음

      expect(creds.provider).toBe("anthropic");
      expect(creds.model).toBe("claude-sonnet-5");
    });
  });

  describe("getOrCreateSettings (via setOrgProviderKey)", () => {
    it("설정 행이 없으면 새로 만들어 키를 저장한다", async () => {
      memberRepo.findOne.mockResolvedValue({ role: "owner" });
      settingsRepo.findOne.mockResolvedValue(null);

      await service.setOrgProviderKey("org-1", "user-1", "anthropic", "sk-new");

      expect(settingsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: "org-1", enabledModels: [] }),
      );
      const saved = settingsRepo.save.mock.calls[0]![0] as { providerKeys: Record<string, string> };
      expect(saved.providerKeys["anthropic"]).toBeDefined();
      expect(saved.providerKeys["anthropic"]).not.toBe("sk-new"); // 암호화됨
    });
  });
});
