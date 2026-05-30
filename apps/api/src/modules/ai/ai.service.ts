import { ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { randomUUID } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { DiagramDocument } from "@erdify/domain";
import { Diagram, OrganizationAiSettings, OrganizationMember } from "@erdify/db";
import type { ColumnSuggestion, OrgAiSettings } from "@erdify/contracts";
import { encrypt, decrypt } from "../../common/utils/field-cipher";
import { UsageService } from "../usage/usage.service";

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-6";
const DEFAULT_OPENAI_MODEL = "gpt-4o";

type Provider = "anthropic" | "openai";

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
    return {
      organizationId: orgId,
      hasApiKey: !!settings?.encryptedApiKey,
      provider: settings?.provider ?? "anthropic",
      model: settings?.model ?? "",
    };
  }

  async updateOrgAiSettings(orgId: string, userId: string, apiKey: string, provider: Provider, model: string): Promise<void> {
    await this.requireOrgOwner(orgId, userId);
    const existing = await this.settingsRepo.findOne({ where: { organizationId: orgId } });
    if (existing) {
      await this.settingsRepo.update(existing.id, { encryptedApiKey: encrypt(apiKey), provider, model });
    } else {
      await this.settingsRepo.save(
        this.settingsRepo.create({
          id: randomUUID(),
          organizationId: orgId,
          encryptedApiKey: encrypt(apiKey),
          provider,
          model,
        })
      );
    }
  }

  // ── Column suggestions ────────────────────────────────────────────────────

  async suggestColumns(userId: string, tableName: string, existingColumns: string[]): Promise<ColumnSuggestion[]> {
    const membership = await this.memberRepo.findOne({ where: { userId } });
    if (!membership) throw new ForbiddenException("조직 멤버십이 없습니다.");
    const { apiKey, provider, model } = await this.getOrgApiKeyAndProvider(membership.organizationId, userId);

    const prompt = `Suggest 5 common columns for a database table named "${tableName}".
Existing columns: ${existingColumns.length > 0 ? existingColumns.join(", ") : "none"}.
Return ONLY a JSON array, no explanation:
[{"name": "...", "type": "...", "nullable": true/false, "pk": true/false}]
Use SQL types like uuid, varchar, integer, bigint, boolean, timestamptz, text, jsonb.`;

    let text = "";
    if (provider === "openai") {
      const client = new OpenAI({ apiKey });
      const res = await client.chat.completions.create({
        model,
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      });
      text = res.choices[0]?.message?.content ?? "";
    } else {
      const client = new Anthropic({ apiKey });
      const res = await client.messages.create({
        model,
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      });
      text = res.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("");
    }

    this.usageService
      .log(membership.organizationId, userId, "ai_suggest_columns", null, null, {
        provider,
        model,
        table_name: tableName,
      })
      .catch((e) => this.logger.error(e));

    try {
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) return [];
      return JSON.parse(match[0]) as ColumnSuggestion[];
    } catch {
      return [];
    }
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

  async getOrgApiKeyAndProvider(orgId: string, userId: string): Promise<{ apiKey: string; provider: Provider; model: string }> {
    await this.requireOrgMember(orgId, userId);
    const settings = await this.settingsRepo.findOne({ where: { organizationId: orgId } });
    if (!settings?.encryptedApiKey) {
      throw new ForbiddenException("조직에 AI API 키가 설정되어 있지 않습니다. 관리자에게 문의하세요.");
    }
    const provider: Provider = settings.provider ?? "anthropic";
    const model = settings.model || (provider === "openai" ? DEFAULT_OPENAI_MODEL : DEFAULT_ANTHROPIC_MODEL);
    return { apiKey: decrypt(settings.encryptedApiKey), provider, model };
  }

  private async requireOrgMember(orgId: string, userId: string): Promise<void> {
    const member = await this.memberRepo.findOne({ where: { organizationId: orgId, userId } });
    if (!member) throw new ForbiddenException("해당 조직의 멤버가 아닙니다.");
  }

  private async requireOrgOwner(orgId: string, userId: string): Promise<void> {
    const member = await this.memberRepo.findOne({ where: { organizationId: orgId, userId } });
    if (!member || member.role !== "owner") throw new ForbiddenException("조직 소유자만 API 키를 설정할 수 있습니다.");
  }
}
