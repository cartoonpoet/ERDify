import { ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { randomUUID } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { DiagramDocument, DiagramColumn, DiagramIndex, DiagramRelationship, RelationshipCardinality } from "@erdify/domain";
import { Diagram, OrganizationAiSettings, OrganizationMember } from "@erdify/db";
import type { AiChatResponse, ColumnSuggestion, DiffChange, OrgAiSettings } from "@erdify/contracts";
import { encrypt, decrypt } from "../../common/utils/field-cipher";
import { DomainLoaderService } from "../../common/services/domain-loader.service";
import { AiHistoryService } from "./ai-history.service";
import { ERD_TOOLS, ERD_TOOLS_OPENAI } from "./erd-tools";
import { UsageService } from "../usage/usage.service";

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-6";
const DEFAULT_OPENAI_MODEL = "gpt-4o";
const MAX_TOKENS = 4096;

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
    private readonly historyService: AiHistoryService,
    private readonly domainLoader: DomainLoaderService,
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

  // ── Chat ──────────────────────────────────────────────────────────────────

  async chat(userId: string, diagramId: string, userMessage: string): Promise<AiChatResponse> {
    const { doc, orgId } = await this.getDiagramAndOrgId(diagramId);
    const { apiKey, provider, model } = await this.getOrgApiKeyAndProvider(orgId, userId);
    const history = await this.historyService.findRecent(userId, diagramId);

    await this.historyService.saveUserMessage(userId, diagramId, userMessage);

    const systemPrompt = `You are a senior database architect assistant inside ERDify, an ERD design tool.
You help users design and modify relational database schemas through natural conversation.
Respond in the same language the user writes in (Korean if they write Korean).

## Core responsibilities
- Interpret user intent and translate it into precise schema changes using the provided tools.
- Think step-by-step: identify what tables, columns, and relationships are needed before calling tools.
- Call multiple tools in a single response when a request requires creating several tables or columns at once.

## Database design best practices you MUST follow
1. **Every new table** must have: \`id\` (uuid, primaryKey, not null), \`created_at\` (timestamptz, not null), \`updated_at\` (timestamptz, not null) — add these automatically unless the user explicitly says not to.
2. **Naming**: snake_case for all table and column names. Plural nouns for tables (users, orders, products).
3. **Foreign keys**: Always use \`addRelation\` with \`fkColumnName\` set to \`<referenced_table_singular>_id\` (e.g. \`user_id\`, \`order_id\`). The FK column (uuid type) is created automatically. Set \`fkNullable: false\` unless the relationship is optional.
4. **Cardinality**: choose the correct direction — one-to-many means the "many" side holds the FK column (sourceTableId = many side).
5. **Data types**: uuid for PKs and FKs, varchar for short strings, text for long strings, integer/bigint for counts, boolean for flags, timestamptz for timestamps, numeric/decimal for money, jsonb for flexible structured data.
5a. **Logical names (comment)**: ALWAYS set the \`comment\` field on every column with a short Korean description of its purpose (e.g. \`id\` → "고유 식별자", \`user_id\` → "사용자 ID", \`title\` → "여행 제목", \`created_at\` → "생성일시").
6. **Indexes**: After every \`addRelation\`, call \`addIndex\` on the FK column (e.g. name: \`idx_orders_user_id\`). Also add unique indexes for natural keys (email, slug, etc.).
7. When the user asks for a "system" or "module" (e.g. "쇼핑몰", "회원 시스템"), proactively design all necessary tables and relationships — don't wait for them to specify each table.

## Multi-table design workflow (MUST follow this order)
When designing multiple tables:
1. Call \`addTable\` for ALL tables first (with their own columns, excluding FK columns).
2. For each relationship, call \`addRelation\` with \`fkColumnName\` — this automatically adds the FK column.
3. Call \`addIndex\` for every FK column created in step 2.
4. Call \`addIndex\` for any natural key columns (email, slug, code, etc.) with \`unique: true\`.

## Rules
- Always use the exact entity/column IDs from the current diagram when modifying existing items.
- Never hallucinate IDs. If you cannot find a referenced table or column in the diagram, say so clearly.
- If the user's request is ambiguous, make a reasonable assumption and explain what you assumed.
- After making changes, briefly summarize what was done in the user's language.

## Current diagram (JSON)
${JSON.stringify(buildDiagramContext(doc, userMessage))}`;

    const { textContent, toolCalls } = provider === "openai"
      ? await this.callOpenAI(apiKey, model, systemPrompt, history, userMessage)
      : await this.callAnthropic(apiKey, model, systemPrompt, history, userMessage);

    let updatedDoc = doc;
    const diffs: DiffChange[] = [];

    for (const call of toolCalls) {
      const result = await this.executeTool(call.name, call.input, updatedDoc);
      updatedDoc = result.doc;
      diffs.push(...result.changes);
    }

    const hasDiff = diffs.length > 0;
    const savedMessage = await this.historyService.saveAssistantMessage(
      userId,
      diagramId,
      textContent || (hasDiff ? "ERD를 업데이트했습니다. 아래 변경사항을 확인해주세요." : ""),
      hasDiff ? diffs : null,
      toolCalls.length > 0 ? toolCalls : null,
    );

    this.usageService
      .log(orgId, userId, "ai_chat", "diagram", diagramId, {
        provider,
        model,
        tool_call_count: toolCalls.length,
      })
      .catch((e) => this.logger.error(e));

    return {
      messageId: savedMessage.id,
      content: savedMessage.content,
      diff: hasDiff ? diffs : null,
      pendingDocument: hasDiff ? updatedDoc : null,
    };
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

  // ── Private: provider-specific API calls ──────────────────────────────────

  private async callAnthropic(
    apiKey: string,
    model: string,
    system: string,
    history: { role: string; content: string }[],
    userMessage: string,
  ): Promise<{ textContent: string; toolCalls: { name: string; input: Record<string, unknown> }[] }> {
    const client = new Anthropic({ apiKey });
    const messages: Anthropic.MessageParam[] = [
      ...history.map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
      { role: "user", content: userMessage },
    ];
    const response = await client.messages.create({
      model,
      max_tokens: MAX_TOKENS,
      system,
      tools: ERD_TOOLS,
      messages,
    });

    const textContent = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("\n");

    const toolCalls = response.content
      .filter((b) => b.type === "tool_use")
      .map((b) => ({ name: (b as { name: string; input: Record<string, unknown> }).name, input: (b as { name: string; input: Record<string, unknown> }).input }));

    return { textContent, toolCalls };
  }

  private async callOpenAI(
    apiKey: string,
    model: string,
    system: string,
    history: { role: string; content: string }[],
    userMessage: string,
  ): Promise<{ textContent: string; toolCalls: { name: string; input: Record<string, unknown> }[] }> {
    const client = new OpenAI({ apiKey });
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: system },
      ...history.map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
      { role: "user", content: userMessage },
    ];
    const isNewModel = /^gpt-5/.test(model);
    const response = await client.chat.completions.create({
      model,
      ...(isNewModel ? { max_completion_tokens: MAX_TOKENS } : { max_tokens: MAX_TOKENS }),
      tools: ERD_TOOLS_OPENAI,
      messages,
    });

    const msg = response.choices[0]?.message;
    const textContent = msg?.content ?? "";
    const toolCalls = (msg?.tool_calls ?? []).map((tc: { function: { name: string; arguments: string } }) => ({
      name: tc.function.name,
      input: JSON.parse(tc.function.arguments) as Record<string, unknown>,
    }));

    return { textContent, toolCalls };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async getDiagramAndOrgId(diagramId: string): Promise<{ doc: DiagramDocument; orgId: string }> {
    const diagram = await this.diagramRepo
      .createQueryBuilder("d")
      .innerJoin("projects", "p", "p.id = d.project_id")
      .where("d.id = :diagramId", { diagramId })
      .select(["d.content AS content", "p.organization_id AS org_id"])
      .getRawOne<{ content: DiagramDocument; org_id: string }>();

    if (!diagram) throw new NotFoundException("다이어그램을 찾을 수 없습니다.");
    return { doc: diagram.content, orgId: diagram.org_id };
  }

  private async getOrgApiKeyAndProvider(orgId: string, userId: string): Promise<{ apiKey: string; provider: Provider; model: string }> {
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

  private async executeTool(
    toolName: string,
    input: Record<string, unknown>,
    doc: DiagramDocument,
  ): Promise<{ doc: DiagramDocument; changes: DiffChange[] }> {
    const domain = await this.domainLoader.load();
    const changes: DiffChange[] = [];
    let updatedDoc = doc;

    switch (toolName) {
      case "addTable": {
        const entityId = randomUUID();
        const name = input["name"] as string;
        updatedDoc = domain.addEntity(doc, { id: entityId, name });
        changes.push({ type: "addTable", tableId: entityId, tableName: name });

        const columns = input["columns"] as Array<{ name: string; type: string; nullable?: boolean; primaryKey?: boolean; unique?: boolean; comment?: string }> | undefined;
        if (columns) {
          for (let i = 0; i < columns.length; i++) {
            const col = columns[i]!;
            const colId = randomUUID();
            const column: DiagramColumn = {
              id: colId, name: col.name, type: col.type,
              nullable: col.nullable ?? true, primaryKey: col.primaryKey ?? false,
              unique: col.unique ?? false, defaultValue: null, comment: col.comment ?? null, ordinal: i,
            };
            updatedDoc = domain.addColumn(updatedDoc, entityId, column);
            changes.push({ type: "addColumn", tableId: entityId, tableName: name, columnId: colId, columnName: col.name, columnType: col.type, ...(col.comment ? { comment: col.comment } : {}) });
          }
        }
        break;
      }
      case "removeTable": {
        const tableId = input["tableId"] as string;
        const entity = doc.entities.find((e) => e.id === tableId);
        if (!entity) break;
        updatedDoc = domain.removeEntity(doc, tableId);
        changes.push({ type: "removeTable", tableId, tableName: entity.name });
        break;
      }
      case "updateTable": {
        const tableId = input["tableId"] as string;
        const entity = doc.entities.find((e) => e.id === tableId);
        if (!entity) break;
        const newName = input["name"] as string;
        updatedDoc = domain.renameEntity(doc, tableId, newName);
        changes.push({ type: "updateTable", tableId, oldName: entity.name, newName });
        break;
      }
      case "addColumn": {
        const tableId = input["tableId"] as string;
        const entity = doc.entities.find((e) => e.id === tableId);
        if (!entity) break;
        const colId = randomUUID();
        const column: DiagramColumn = {
          id: colId,
          name: input["name"] as string,
          type: input["type"] as string,
          nullable: (input["nullable"] as boolean | undefined) ?? true,
          primaryKey: (input["primaryKey"] as boolean | undefined) ?? false,
          unique: (input["unique"] as boolean | undefined) ?? false,
          defaultValue: (input["defaultValue"] as string | undefined) ?? null,
          comment: (input["comment"] as string | undefined) ?? null,
          ordinal: entity.columns.length,
        };
        updatedDoc = domain.addColumn(doc, tableId, column);
        changes.push({ type: "addColumn", tableId, tableName: entity.name, columnId: colId, columnName: column.name, columnType: column.type, ...(column.comment ? { comment: column.comment } : {}) });
        break;
      }
      case "removeColumn": {
        const tableId = input["tableId"] as string;
        const colId = input["columnId"] as string;
        const entity = doc.entities.find((e) => e.id === tableId);
        const col = entity?.columns.find((c) => c.id === colId);
        if (!entity || !col) break;
        updatedDoc = domain.removeColumn(doc, tableId, colId);
        changes.push({ type: "removeColumn", tableId, tableName: entity.name, columnId: colId, columnName: col.name });
        break;
      }
      case "updateColumn": {
        const tableId = input["tableId"] as string;
        const colId = input["columnId"] as string;
        const entity = doc.entities.find((e) => e.id === tableId);
        const col = entity?.columns.find((c) => c.id === colId);
        if (!entity || !col) break;
        const patch: Partial<Omit<DiagramColumn, "id">> = {};
        if (input["name"] !== undefined) patch.name = input["name"] as string;
        if (input["type"] !== undefined) patch.type = input["type"] as string;
        if (input["nullable"] !== undefined) patch.nullable = input["nullable"] as boolean;
        if (input["primaryKey"] !== undefined) patch.primaryKey = input["primaryKey"] as boolean;
        if (input["unique"] !== undefined) patch.unique = input["unique"] as boolean;
        if (input["defaultValue"] !== undefined) patch.defaultValue = input["defaultValue"] as string | null;
        updatedDoc = domain.updateColumn(doc, tableId, colId, patch);
        changes.push({ type: "updateColumn", tableId, tableName: entity.name, columnId: colId, columnName: col.name, changes: Object.keys(patch) });
        break;
      }
      case "addRelation": {
        const relId = randomUUID();
        const src = doc.entities.find((e) => e.id === input["sourceTableId"]);
        const tgt = doc.entities.find((e) => e.id === input["targetTableId"]);
        if (!src || !tgt) break;

        // Auto-create FK column on the source table
        const fkColumnName = input["fkColumnName"] as string | undefined;
        let fkColId: string | undefined;
        if (fkColumnName) {
          const alreadyExists = src.columns.find((c) => c.name === fkColumnName);
          if (!alreadyExists) {
            fkColId = randomUUID();
            const fkColumn: DiagramColumn = {
              id: fkColId, name: fkColumnName, type: "uuid",
              nullable: (input["fkNullable"] as boolean | undefined) ?? false,
              primaryKey: false, unique: false, defaultValue: null, comment: null,
              ordinal: src.columns.length,
            };
            updatedDoc = domain.addColumn(updatedDoc, src.id, fkColumn);
            changes.push({ type: "addColumn", tableId: src.id, tableName: src.name, columnId: fkColId, columnName: fkColumnName, columnType: "uuid" });
          } else {
            fkColId = alreadyExists.id;
          }
        }

        const rel: DiagramRelationship = {
          id: relId, name: "",
          sourceEntityId: input["sourceTableId"] as string,
          sourceColumnIds: fkColId ? [fkColId] : [],
          targetEntityId: input["targetTableId"] as string,
          targetColumnIds: [],
          cardinality: input["cardinality"] as RelationshipCardinality,
          onDelete: "no-action", onUpdate: "no-action", identifying: false,
        };
        updatedDoc = domain.addRelationship(updatedDoc, rel);
        changes.push({ type: "addRelation", relationId: relId, fromTable: src.name, toTable: tgt.name, cardinality: input["cardinality"] as string });
        break;
      }
      case "removeRelation": {
        const relId = input["relationId"] as string;
        const rel = doc.relationships.find((r) => r.id === relId);
        if (!rel) break;
        const src = doc.entities.find((e) => e.id === rel.sourceEntityId);
        const tgt = doc.entities.find((e) => e.id === rel.targetEntityId);
        updatedDoc = domain.removeRelationship(doc, relId);
        changes.push({ type: "removeRelation", relationId: relId, fromTable: src?.name ?? rel.sourceEntityId, toTable: tgt?.name ?? rel.targetEntityId });
        break;
      }
      case "addIndex": {
        const tableId = input["tableId"] as string;
        const entity = updatedDoc.entities.find((e) => e.id === tableId);
        if (!entity) break;
        const indexId = randomUUID();
        const columnIds = input["columnIds"] as string[];
        const unique = (input["unique"] as boolean | undefined) ?? false;
        const index: DiagramIndex = {
          id: indexId,
          entityId: tableId,
          name: input["name"] as string,
          columnIds,
          unique,
        };
        updatedDoc = domain.addIndex(updatedDoc, index);
        const columnNames = columnIds.map((cid) => entity.columns.find((c) => c.id === cid)?.name ?? cid);
        changes.push({ type: "addIndex", indexId, tableName: entity.name, indexName: input["name"] as string, columnNames, unique });
        break;
      }
    }

    return { doc: updatedDoc, changes };
  }
}

function buildDiagramContext(doc: DiagramDocument, userMessage: string) {
  // 사용자 메시지에서 언급된 테이블 ID 수집
  const msgLower = userMessage.toLowerCase();
  const mentionedIds = new Set(
    doc.entities.filter((e) => msgLower.includes(e.name.toLowerCase())).map((e) => e.id)
  );

  // 언급된 테이블과 관계로 연결된 테이블도 포함
  doc.relationships.forEach((r) => {
    if (mentionedIds.has(r.sourceEntityId)) mentionedIds.add(r.targetEntityId);
    if (mentionedIds.has(r.targetEntityId)) mentionedIds.add(r.sourceEntityId);
  });

  const detailEntity = (e: DiagramDocument["entities"][number]) => ({
    id: e.id,
    name: e.name,
    ...(e.schema ? { schema: e.schema } : {}),
    columns: e.columns.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      nullable: c.nullable,
      primaryKey: c.primaryKey,
      unique: c.unique,
      ...(c.defaultValue !== null ? { defaultValue: c.defaultValue } : {}),
    })),
  });

  const summaryEntity = (e: DiagramDocument["entities"][number]) => ({
    id: e.id,
    name: e.name,
    ...(e.schema ? { schema: e.schema } : {}),
    columnCount: e.columns.length,
  });

  // 언급된 테이블이 없으면 전체를 상세 전송하되 60k자 초과 시 요약으로 폴백
  const useFullDetail = mentionedIds.size === 0;
  const fullContext = {
    id: doc.id,
    name: doc.name,
    dialect: doc.dialect,
    entities: doc.entities.map((e) =>
      (!useFullDetail && mentionedIds.has(e.id)) || useFullDetail ? detailEntity(e) : summaryEntity(e)
    ),
    relationships: doc.relationships.map((r) => ({
      id: r.id,
      sourceEntityId: r.sourceEntityId,
      targetEntityId: r.targetEntityId,
      cardinality: r.cardinality,
    })),
  };

  // 60k자(~15k토큰) 초과 시 전체를 요약으로 전송
  if (JSON.stringify(fullContext).length > 60_000) {
    return {
      ...fullContext,
      _note: "Large diagram: only mentioned tables shown in full detail, others summarized.",
      entities: doc.entities.map((e) =>
        mentionedIds.has(e.id) ? detailEntity(e) : summaryEntity(e)
      ),
    };
  }

  return fullContext;
}
