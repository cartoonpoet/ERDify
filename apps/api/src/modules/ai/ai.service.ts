import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { randomUUID } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { DiagramDocument } from "@erdify/domain";
import { Diagram, OrganizationAiSettings, OrganizationMember } from "@erdify/db";
import type { ColumnSuggestion, OrgAiSettings, AiChatConfig, AiModelOption, AiProviderId } from "@erdify/contracts";
import { AI_MODELS, AI_PROVIDERS, providerOfModel } from "@erdify/contracts";
import { encrypt, decrypt } from "../../common/utils/field-cipher";
import { UsageService } from "../usage/usage.service";

interface ChatCredentials {
  apiKey: string;
  provider: AiProviderId;
  model: string;
}

/** 등록된 provider(키 있음) × 허용 모델(allowlist 비면 전부)로 채팅에서 고를 수 있는 모델 목록. */
function availableModels(settings: OrganizationAiSettings | null): AiModelOption[] {
  if (!settings) return [];
  const keys = settings.providerKeys ?? {};
  const registered = new Set(AI_PROVIDERS.filter((p) => !!keys[p]));
  let models = AI_MODELS.filter((m) => registered.has(m.provider));
  const enabled = settings.enabledModels ?? [];
  if (enabled.length > 0) models = models.filter((m) => enabled.includes(m.value));
  return models;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @InjectRepository(OrganizationAiSettings)
    private readonly settingsRepo: Repository<OrganizationAiSettings>,
    @InjectRepository(Diagram)
    private readonly diagramRepo: Repository<Diagram>,
    @InjectRepository(OrganizationMember)
    private readonly memberRepo: Repository<OrganizationMember>,
    private readonly usageService: UsageService,
  ) {}

  // ── Org settings ──────────────────────────────────────────────────────────

  async getOrgAiSettings(orgId: string, userId: string): Promise<OrgAiSettings> {
    await this.requireOrgMember(orgId, userId);
    const settings = await this.settingsRepo.findOne({ where: { organizationId: orgId } });
    const keys = settings?.providerKeys ?? {};
    return {
      organizationId: orgId,
      providers: { anthropic: !!keys["anthropic"], openai: !!keys["openai"], gemini: !!keys["gemini"] },
      enabledModels: settings?.enabledModels ?? [],
    };
  }

  /** provider 키 등록/교체 (owner). */
  async setOrgProviderKey(orgId: string, userId: string, provider: AiProviderId, apiKey: string): Promise<void> {
    await this.requireOrgOwner(orgId, userId);
    if (!AI_PROVIDERS.includes(provider)) throw new BadRequestException("알 수 없는 provider입니다.");
    const settings = await this.getOrCreateSettings(orgId);
    settings.providerKeys = { ...settings.providerKeys, [provider]: encrypt(apiKey) };
    await this.settingsRepo.save(settings);
  }

  /** provider 키 삭제 (owner). */
  async removeOrgProviderKey(orgId: string, userId: string, provider: AiProviderId): Promise<void> {
    await this.requireOrgOwner(orgId, userId);
    const settings = await this.settingsRepo.findOne({ where: { organizationId: orgId } });
    if (!settings) return;
    const next = { ...settings.providerKeys };
    delete next[provider];
    settings.providerKeys = next;
    await this.settingsRepo.save(settings);
  }

  /** 허용 모델 목록 설정 (owner). */
  async setEnabledModels(orgId: string, userId: string, models: string[]): Promise<void> {
    await this.requireOrgOwner(orgId, userId);
    const valid = new Set(AI_MODELS.map((m) => m.value));
    const filtered = models.filter((m) => valid.has(m));
    const settings = await this.getOrCreateSettings(orgId);
    settings.enabledModels = filtered;
    await this.settingsRepo.save(settings);
  }

  // ── Chat config ─────────────────────────────────────────────────────────────

  async getDiagramAiConfig(userId: string, diagramId: string): Promise<AiChatConfig> {
    const { orgId } = await this.getDiagramAndOrgId(diagramId);
    await this.requireOrgMember(orgId, userId);
    const settings = await this.settingsRepo.findOne({ where: { organizationId: orgId } });
    return { models: availableModels(settings) };
  }

  // ── Column suggestions ────────────────────────────────────────────────────

  async suggestColumns(userId: string, tableName: string, existingColumns: string[]): Promise<ColumnSuggestion[]> {
    const membership = await this.memberRepo.findOne({ where: { userId } });
    if (!membership) throw new ForbiddenException("조직 멤버십이 없습니다.");
    const { apiKey, provider, model } = await this.resolveChatCredentials(membership.organizationId, userId);

    const prompt = `Suggest 5 common columns for a database table named "${tableName}".
Existing columns: ${existingColumns.length > 0 ? existingColumns.join(", ") : "none"}.
Return ONLY a JSON array, no explanation:
[{"name": "...", "type": "...", "nullable": true/false, "pk": true/false}]
Use SQL types like uuid, varchar, integer, bigint, boolean, timestamptz, text, jsonb.`;

    const text = await this.oneShot(provider, apiKey, model, prompt, 512);

    this.usageService
      .log(membership.organizationId, userId, "ai_suggest_columns", null, null, { provider, model, table_name: tableName })
      .catch((e) => this.logger.error(e));

    try {
      // 첫 "["부터 마지막 "]"까지를 JSON 배열 후보로 추출한다.
      // (기존 /\[[\s\S]*\]/ 정규식과 동일한 의미 — 백트래킹 없이 선형 시간으로 동작)
      const start = text.indexOf("[");
      const end = text.lastIndexOf("]");
      if (start === -1 || end <= start) return [];
      return JSON.parse(text.slice(start, end + 1)) as ColumnSuggestion[];
    } catch {
      return [];
    }
  }

  // ── One-shot completion (column suggestions, announcements 등 재사용) ────────

  /** provider별 SDK를 통일된 인터페이스로 호출하는 단발성 텍스트 완성. */
  private async oneShot(provider: AiProviderId, apiKey: string, model: string, prompt: string, maxTokens: number): Promise<string> {
    if (provider === "openai") {
      const client = new OpenAI({ apiKey });
      const isNewModel = model.startsWith("gpt-5");
      const res = await client.chat.completions.create({
        model,
        ...(isNewModel ? { max_completion_tokens: maxTokens } : { max_tokens: maxTokens }),
        messages: [{ role: "user", content: prompt }],
      });
      return res.choices[0]?.message?.content ?? "";
    }
    if (provider === "gemini") {
      const genAI = new GoogleGenerativeAI(apiKey);
      const gModel = genAI.getGenerativeModel({ model });
      const res = await gModel.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      });
      return res.response.text();
    }
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    });
    return res.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");
  }

  /** 유저가 속한 조직의 등록 키로 단발성 텍스트 완성을 수행한다(조직 외부 어드민 기능에서 재사용). */
  async completeForUser(userId: string, prompt: string, maxTokens: number): Promise<string> {
    const membership = await this.memberRepo.findOne({ where: { userId } });
    if (!membership) throw new ForbiddenException("조직 멤버십이 없습니다. AI 키가 등록된 조직에 속해 있어야 합니다.");
    const { apiKey, provider, model } = await this.resolveChatCredentials(membership.organizationId, userId);
    return this.oneShot(provider, apiKey, model, prompt, maxTokens);
  }

  // ── Shared helpers (used by AiChatService) ──────────────────────────────────

  async getDiagramAndOrgId(diagramId: string): Promise<{ doc: DiagramDocument; orgId: string; diagramName: string }> {
    const diagram = await this.diagramRepo
      .createQueryBuilder("d")
      .innerJoin("projects", "p", "p.id = d.project_id")
      .where("d.id = :diagramId", { diagramId })
      .select(["d.content AS content", "d.name AS name", "p.organization_id AS org_id"])
      .getRawOne<{ content: DiagramDocument; name: string; org_id: string }>();

    if (!diagram) throw new NotFoundException("다이어그램을 찾을 수 없습니다.");
    return { doc: diagram.content, orgId: diagram.org_id, diagramName: diagram.name };
  }

  /** 요청된 모델(없으면 첫 허용 모델)에 맞는 provider 키를 해석해 반환. */
  async resolveChatCredentials(orgId: string, userId: string, requestedModel?: string): Promise<ChatCredentials> {
    await this.requireOrgMember(orgId, userId);
    const settings = await this.settingsRepo.findOne({ where: { organizationId: orgId } });
    const available = availableModels(settings);
    if (!settings || available.length === 0) {
      throw new ForbiddenException("조직에 사용 가능한 AI 모델이 없습니다. 관리자에게 API 키 설정을 문의하세요.");
    }
    const chosen = requestedModel && available.some((m) => m.value === requestedModel)
      ? requestedModel
      : available[0]!.value;
    const provider = providerOfModel(chosen)!;
    const enc = settings.providerKeys?.[provider];
    if (!enc) throw new ForbiddenException("선택한 모델의 provider에 API 키가 없습니다.");
    return { apiKey: decrypt(enc), provider, model: chosen };
  }

  private async getOrCreateSettings(orgId: string): Promise<OrganizationAiSettings> {
    const existing = await this.settingsRepo.findOne({ where: { organizationId: orgId } });
    if (existing) return existing;
    return this.settingsRepo.create({
      id: randomUUID(),
      organizationId: orgId,
      encryptedApiKey: null,
      provider: "anthropic",
      model: "",
      providerKeys: {},
      enabledModels: [],
    });
  }

  private async requireOrgMember(orgId: string, userId: string): Promise<void> {
    const member = await this.memberRepo.findOne({ where: { organizationId: orgId, userId } });
    if (!member) throw new ForbiddenException("해당 조직의 멤버가 아닙니다.");
  }

  private async requireOrgOwner(orgId: string, userId: string): Promise<void> {
    const member = await this.memberRepo.findOne({ where: { organizationId: orgId, userId } });
    if (member?.role !== "owner") throw new ForbiddenException("조직 소유자만 API 키를 설정할 수 있습니다.");
  }
}
