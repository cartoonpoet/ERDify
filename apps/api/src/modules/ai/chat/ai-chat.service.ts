import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User, Organization } from "@erdify/db";
import type { DiffChange, AiStreamEvent } from "@erdify/contracts";
import type { DiagramDocument } from "@erdify/domain";
import { AiService } from "../ai.service";
import { AiHistoryService } from "../ai-history.service";
import { ToolExecutor } from "../tools/tool-executor";
import { UsageService } from "../../usage/usage.service";
import { AnthropicProvider } from "../providers/anthropic.provider";
import { OpenAiProvider } from "../providers/openai.provider";
import { GeminiProvider } from "../providers/gemini.provider";
import { buildSystemPrompt } from "../context/context-builder";
import { ERD_TOOLS } from "../erd-tools";
import { READ_TOOLS } from "../tools/read-tools";
import type { ConvMessage, AiProvider, NormalizedToolCall } from "../providers/provider.types";

const MAX_TOKENS = 4096;
const MAX_ITERATIONS = 8;
const READ_TOOL_NAMES = new Set(["listTables", "getTableDetails"]);
const APPLY_NUDGE =
  "Now apply the schema improvements you just identified using the editing tools (addRelation, addIndex, addTable, addColumn, updateColumn, removeColumn, etc.) so the user gets a reviewable diff. Make the concrete changes now — do not just describe them again. If, and only if, no change is actually warranted, reply in one short sentence saying the schema is already fine.";

export interface RunChatParams {
  userId: string;
  diagramId: string;
  message: string;
  /** 조직 기본 모델을 덮어쓰는 채팅 단위 모델 선택 (provider에 맞는 모델이어야 함). */
  model?: string;
  isAborted?: () => boolean;
}

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly historyService: AiHistoryService,
    private readonly toolExecutor: ToolExecutor,
    private readonly usageService: UsageService,
    private readonly anthropic: AnthropicProvider,
    private readonly openai: OpenAiProvider,
    private readonly gemini: GeminiProvider,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Organization) private readonly orgRepo: Repository<Organization>,
  ) {}

  async runChat(params: RunChatParams, emit: (e: AiStreamEvent) => void): Promise<void> {
    try {
      const { userId, diagramId, message } = params;
      const { doc, orgId, diagramName } = await this.aiService.getDiagramAndOrgId(diagramId);
      const { apiKey, provider, model } = await this.aiService.resolveChatCredentials(orgId, userId, params.model?.trim());

      const [user, org] = await Promise.all([
        this.userRepo.findOne({ where: { id: userId } }),
        this.orgRepo.findOne({ where: { id: orgId } }),
      ]);
      const today = new Date().toISOString().slice(0, 10);
      const system = buildSystemPrompt(doc, {
        userName: user?.name ?? "Unknown",
        userEmail: user?.email ?? "",
        orgName: org?.name ?? "",
        diagramId,
        diagramName,
        today,
      });

      const history = await this.historyService.findRecentTurns(userId, diagramId);
      await this.historyService.saveUserMessage(userId, diagramId, message);

      const tools = [...ERD_TOOLS, ...READ_TOOLS];
      const impl: AiProvider = provider === "openai" ? this.openai : provider === "gemini" ? this.gemini : this.anthropic;
      const messages: ConvMessage[] = [...history, { role: "user", content: message }];

      let updatedDoc: DiagramDocument = doc;
      const diffs: DiffChange[] = [];
      const allToolCalls: NormalizedToolCall[] = [];
      let finalText = "";
      let usedReadTools = false;
      let nudgedToApply = false;

      for (let i = 0; i < MAX_ITERATIONS; i++) {
        if (params.isAborted?.()) return;
        const turn = await impl.streamTurn({
          apiKey,
          model,
          system,
          messages,
          tools,
          maxTokens: MAX_TOKENS,
          onText: (d) => emit({ type: "step", text: d }),
        });
        finalText = turn.text;
        if (turn.toolCalls.length === 0) {
          // 스키마를 조회(분석)해놓고 아무 변경도 적용하지 않은 채 끝나면, 한 번만 적용을 유도.
          // (순수 정보 질문은 읽기 도구를 쓰지 않으므로 발동하지 않음)
          if (!nudgedToApply && usedReadTools && diffs.length === 0) {
            nudgedToApply = true;
            messages.push({ role: "assistant", text: turn.text, toolCalls: [] });
            messages.push({ role: "user", content: APPLY_NUDGE });
            continue;
          }
          break;
        }

        messages.push({ role: "assistant", text: turn.text, toolCalls: turn.toolCalls });
        const results: { toolCallId: string; toolName: string; content: string }[] = [];
        for (const call of turn.toolCalls) {
          allToolCalls.push(call);
          if (READ_TOOL_NAMES.has(call.name)) usedReadTools = true;
          emit({ type: "tool_call", name: call.name, label: toolLabel(call) });
          const res = await this.toolExecutor.execute(call.name, call.input, updatedDoc);
          updatedDoc = res.doc;
          for (const ch of res.changes) {
            diffs.push(ch);
            emit({ type: "tool_result", change: ch });
          }
          results.push({ toolCallId: call.id, toolName: call.name, content: res.resultText });
        }
        messages.push({ role: "tool", results });
        if (i === MAX_ITERATIONS - 1) this.logger.warn(`AI loop hit MAX_ITERATIONS for diagram ${diagramId}`);
      }

      const hasDiff = diffs.length > 0;
      const content = finalText || (hasDiff ? "ERD를 업데이트했습니다. 아래 변경사항을 확인해주세요." : "");
      const saved = await this.historyService.saveAssistantMessage(
        userId,
        diagramId,
        content,
        hasDiff ? diffs : null,
        allToolCalls.length ? (allToolCalls as unknown as Record<string, unknown>[]) : null,
      );

      this.usageService
        .log(orgId, userId, "ai_chat", "diagram", diagramId, { provider, model, tool_call_count: allToolCalls.length })
        .catch((e) => this.logger.error(e));

      emit({
        type: "done",
        messageId: saved.id,
        content,
        diff: hasDiff ? diffs : null,
        pendingDocument: hasDiff ? updatedDoc : null,
      });
    } catch (e) {
      this.logger.error(e);
      emit({ type: "error", message: e instanceof Error ? e.message : "AI 처리 중 오류가 발생했습니다." });
    }
  }
}

function toolLabel(call: NormalizedToolCall): string {
  const name = (call.input["name"] as string) ?? "";
  switch (call.name) {
    case "addTable": return `${name} 테이블 생성 중`;
    case "removeTable": return "테이블 삭제 중";
    case "updateTable": return "테이블 수정 중";
    case "addColumn": return `${name} 컬럼 추가 중`;
    case "removeColumn": return "컬럼 삭제 중";
    case "updateColumn": return "컬럼 수정 중";
    case "addRelation": return "관계 추가 중";
    case "removeRelation": return "관계 삭제 중";
    case "addIndex": return "인덱스 추가 중";
    case "listTables": return "스키마 조회 중";
    case "getTableDetails": return "테이블 상세 조회 중";
    default: return `${call.name} 실행 중`;
  }
}
