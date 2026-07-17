import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User, Organization } from "@erdify/db";
import type { DiffChange } from "@erdify/contracts";
import type { DiagramDocument } from "@erdify/domain";
import { AiService } from "../ai.service";
import { AiHistoryService } from "../ai-history.service";
import { ToolExecutor } from "../tools/tool-executor";
import { DomainLoaderService } from "../../../common/services/domain-loader.service";
import { UsageService } from "../../usage/usage.service";
import { AnthropicProvider } from "../providers/anthropic.provider";
import { OpenAiProvider } from "../providers/openai.provider";
import { GeminiProvider } from "../providers/gemini.provider";
import { buildSystemPrompt } from "../context/context-builder";
import { classifyIntent } from "../context/intent";
import { ERD_TOOLS } from "../erd-tools";
import { READ_TOOLS } from "../tools/read-tools";
import type { ConvMessage, AiProvider, NormalizedToolCall } from "../providers/provider.types";

const MAX_TOKENS = 8192;
const MAX_ITERATIONS = 16;
/** 적용 전 자동검증에서 새 오류가 나오면 모델에게 수정 기회를 주는 최대 횟수. */
const MAX_VALIDATION_RETRIES = 2;
const READ_TOOL_NAMES = new Set(["listTables", "getTableDetails"]);
const APPLY_NUDGE =
  "Now apply the schema improvements you just identified using the editing tools (addRelation, addIndex, addTable, addColumn, updateColumn, removeColumn, etc.) so the user gets a reviewable diff. Make the concrete changes now — do not just describe them again. If, and only if, no change is actually warranted, reply in one short sentence saying the schema is already fine.";
/** 응답이 출력 길이 제한으로 잘렸을 때, 이미 적용한 변경은 유지한 채 남은 작업을 끝까지 이어가도록 유도. */
const CONTINUE_NUDGE =
  "직전 응답이 출력 길이 제한으로 중간에 끊겼어. 이미 적용된 변경은 그대로 두고, 같은 내용을 반복하지 말고 아직 처리하지 못한 나머지 작업을 편집 도구로 이어서 끝까지 완료해줘. 모든 작업이 끝났으면 그때 한 줄로 마무리해줘.";

/** SSE 이벤트 (프론트 sendAiChatStream과 호환되는 master 프로토콜). */
export type StreamEvent =
  | { event: "text"; delta: string }
  | { event: "status"; label: string } // 도구 진행 표시(메시지 본문에 누적되지 않는 일시적 상태)
  | { event: "done"; messageId: string; content: string; diff: DiffChange[] | null; pendingDocument: DiagramDocument | null }
  | { event: "error"; message: string };

export interface RunChatParams {
  userId: string;
  diagramId: string;
  message: string;
  sessionId: string | null;
  model?: string;
  isAborted?: () => boolean;
}

type DomainModule = Awaited<ReturnType<DomainLoaderService["load"]>>;

/** 에이전트 루프가 진행되며 누적하는 상태. */
interface LoopState {
  updatedDoc: DiagramDocument;
  diffs: DiffChange[];
  allToolCalls: NormalizedToolCall[];
  usedReadTools: boolean;
  nudgedToApply: boolean;
  validationAttempts: number;
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
    private readonly domainLoader: DomainLoaderService,
  ) {}

  async runChat(params: RunChatParams, emit: (e: StreamEvent) => void): Promise<void> {
    const { userId, diagramId, message, sessionId } = params;
    try {
      const { doc, orgId, diagramName } = await this.aiService.getDiagramAndOrgId(diagramId);
      const { apiKey, provider, model } = await this.aiService.resolveChatCredentials(orgId, userId, params.model?.trim());
      const domain = await this.domainLoader.load();
      const system = await this.buildSystem(doc, domain, { userId, orgId, diagramId, diagramName, message });
      // ② 적용 전 검증의 기준선: 원본 문서에 이미 존재하던 오류는 AI 책임이 아니므로 제외한다
      const baseErrors = new Set([...domain.validateDiagram(doc).errors, ...extraIntegrityErrors(doc)]);

      const history = await this.historyService.findRecentTurns(userId, diagramId, sessionId);
      await this.historyService.saveUserMessage(userId, diagramId, message, sessionId);

      const tools = [...ERD_TOOLS, ...READ_TOOLS];
      const impl = this.pickProvider(provider);
      const messages: ConvMessage[] = [...history, { role: "user", content: message }];
      const state: LoopState = {
        updatedDoc: doc,
        diffs: [],
        allToolCalls: [],
        usedReadTools: false,
        nudgedToApply: false,
        validationAttempts: 0,
      };
      let finalText = "";

      for (let i = 0; i < MAX_ITERATIONS; i++) {
        if (params.isAborted?.()) return;
        const turn = await impl.streamTurn({
          apiKey,
          model,
          system,
          messages,
          tools,
          maxTokens: MAX_TOKENS,
          onText: (d) => emit({ event: "text", delta: d }),
        });
        finalText = turn.text;
        if (turn.toolCalls.length === 0) {
          const nudge = this.resolveNoToolNudge(turn, i, state, domain, baseErrors, diagramId);
          if (!nudge) break;
          messages.push({ role: "assistant", text: turn.text, toolCalls: [] }, { role: "user", content: nudge });
          continue;
        }

        messages.push({ role: "assistant", text: turn.text, toolCalls: turn.toolCalls });
        await this.processToolCalls(turn.toolCalls, state, messages, emit);
        if (i === MAX_ITERATIONS - 1) this.logger.warn(`AI loop hit MAX_ITERATIONS for diagram ${diagramId}`);
      }

      await this.finalizeChat({ userId, diagramId, sessionId, orgId, provider, model }, state, finalText, emit);
    } catch (e) {
      this.logger.error(e);
      emit({ event: "error", message: e instanceof Error ? e.message : "AI 처리 중 오류가 발생했습니다." });
    }
  }

  /** provider id에 맞는 구현체를 고른다. */
  private pickProvider(provider: string): AiProvider {
    if (provider === "openai") return this.openai;
    if (provider === "gemini") return this.gemini;
    return this.anthropic;
  }

  /** 사용자/조직 메타 + 결정적 스키마 분석 결과로 시스템 프롬프트를 조립한다. */
  private async buildSystem(
    doc: DiagramDocument,
    domain: DomainModule,
    args: { userId: string; orgId: string; diagramId: string; diagramName: string; message: string },
  ): Promise<string> {
    const [user, org] = await Promise.all([
      this.userRepo.findOne({ where: { id: args.userId } }),
      this.orgRepo.findOne({ where: { id: args.orgId } }),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    // ① 결정적 스키마 분석 → VERIFIED FACTS로 주입 (추측이 아닌 코드 계산 결과)
    const facts = domain.analyzeSchema(doc);
    // ④ 스키마-RAG: 큰 다이어그램에서 질의 관련 테이블을 완전한 형태로 포함하기 위한 선택
    const focusTableIds = domain.selectRelevantTables(doc, args.message);
    // ⑤ 의도 분류: 의도별 가이드 + 근거기반 규칙을 프롬프트에 반영
    const intent = classifyIntent(args.message);
    // ⑥ 컨벤션 추출: 새 객체 생성 시 기존 규칙을 그대로 따르도록 주입(요약돼도 근거 유지)
    const conventions = domain.detectConventions(doc);
    return buildSystemPrompt(
      doc,
      {
        userName: user?.name ?? "Unknown",
        userEmail: user?.email ?? "",
        orgName: org?.name ?? "",
        diagramId: args.diagramId,
        diagramName: args.diagramName,
        today,
      },
      facts,
      { focusTableIds, intent, conventions },
    );
  }

  /**
   * 도구 호출 없이 turn이 끝났을 때 루프를 이어갈지 결정한다.
   * 이어가야 하면 모델에게 보낼 nudge 메시지를, 종료해야 하면 null을 반환한다.
   */
  private resolveNoToolNudge(
    turn: { text: string; truncated: boolean },
    iteration: number,
    state: LoopState,
    domain: DomainModule,
    baseErrors: Set<string>,
    diagramId: string,
  ): string | null {
    // 출력 토큰 한도로 응답이 잘렸으면 끝난 게 아니다 — 남은 작업을 이어가도록 유도한다.
    // (큰 테이블 정규화처럼 변경량이 많을 때 일부만 적용되고 멈추는 문제를 방지)
    if (turn.truncated && iteration < MAX_ITERATIONS - 1) {
      this.logger.warn(`AI turn truncated by max_tokens for diagram ${diagramId}; continuing`);
      return CONTINUE_NUDGE;
    }
    // 스키마를 조회(분석)만 하고 변경 없이 끝나면 한 번 적용을 유도
    if (!state.nudgedToApply && state.usedReadTools && state.diffs.length === 0) {
      state.nudgedToApply = true;
      return APPLY_NUDGE;
    }
    // ② 적용 전 자동검증: 변경이 있으면 커밋 전에 무결성을 확인하고,
    //    AI가 새로 만든 오류가 있으면 모델에게 수정 기회를 준다.
    if (state.diffs.length > 0 && state.validationAttempts < MAX_VALIDATION_RETRIES) {
      const newErrors = [...domain.validateDiagram(state.updatedDoc).errors, ...extraIntegrityErrors(state.updatedDoc)]
        .filter((e) => !baseErrors.has(e));
      if (newErrors.length > 0) {
        state.validationAttempts++;
        this.logger.warn(`AI proposed invalid changes for diagram ${diagramId}: ${newErrors.join(" | ")}`);
        return `제안한 변경이 스키마 검증에 실패했어. 다음 문제를 편집 도구로 직접 수정해줘(없는 id/컬럼을 참조하지 말고, 필요하면 listTables·getTableDetails로 실제 id를 먼저 확인해):\n- ${newErrors.join("\n- ")}`;
      }
    }
    return null;
  }

  /** turn의 도구 호출을 순서대로 실행하고, 결과를 state와 대화 메시지에 반영한다. */
  private async processToolCalls(
    toolCalls: NormalizedToolCall[],
    state: LoopState,
    messages: ConvMessage[],
    emit: (e: StreamEvent) => void,
  ): Promise<void> {
    const results: { toolCallId: string; toolName: string; content: string }[] = [];
    for (const call of toolCalls) {
      state.allToolCalls.push(call);
      if (READ_TOOL_NAMES.has(call.name)) state.usedReadTools = true;
      emit({ event: "status", label: toolLabel(call) });
      const res = await this.toolExecutor.execute(call.name, call.input, state.updatedDoc);
      state.updatedDoc = res.doc;
      for (const ch of res.changes) state.diffs.push(ch);
      results.push({ toolCallId: call.id, toolName: call.name, content: res.resultText });
    }
    messages.push({ role: "tool", results });
  }

  /** 어시스턴트 메시지 저장 + 사용량 로깅 + done 이벤트 방출. */
  private async finalizeChat(
    meta: { userId: string; diagramId: string; sessionId: string | null; orgId: string; provider: string; model: string },
    state: LoopState,
    finalText: string,
    emit: (e: StreamEvent) => void,
  ): Promise<void> {
    const hasDiff = state.diffs.length > 0;
    const content = finalText || (hasDiff ? "ERD를 업데이트했습니다. 아래 변경사항을 확인해주세요." : "");
    const saved = await this.historyService.saveAssistantMessage(
      meta.userId,
      meta.diagramId,
      content,
      hasDiff ? state.diffs : null,
      state.allToolCalls.length ? (state.allToolCalls as unknown as Record<string, unknown>[]) : null,
      meta.sessionId,
    );

    this.usageService
      .log(meta.orgId, meta.userId, "ai_chat", "diagram", meta.diagramId, { provider: meta.provider, model: meta.model, tool_call_count: state.allToolCalls.length })
      .catch((e) => this.logger.error(e));

    emit({
      event: "done",
      messageId: saved.id,
      content,
      diff: hasDiff ? state.diffs : null,
      pendingDocument: hasDiff ? state.updatedDoc : null,
    });
  }
}

type DiagramEntity = DiagramDocument["entities"][number];

function duplicateColumnNameErrors(doc: DiagramDocument): string[] {
  const errors: string[] = [];
  for (const entity of doc.entities) {
    const seen = new Set<string>();
    for (const col of entity.columns) {
      const key = col.name.toLowerCase();
      if (seen.has(key)) errors.push(`Table "${entity.name}" has duplicate column name "${col.name}".`);
      seen.add(key);
    }
  }
  return errors;
}

function collectMissingRelationColumns(
  errors: string[],
  relId: string,
  entity: DiagramEntity | undefined,
  columnIds: string[],
  side: "source" | "target",
): void {
  if (!entity) return;
  for (const cid of columnIds) {
    if (!entity.columns.some((c) => c.id === cid)) {
      errors.push(`Relationship ${relId} references missing ${side} column ${cid} on "${entity.name}".`);
    }
  }
}

function relationshipColumnErrors(doc: DiagramDocument, entityById: Map<string, DiagramEntity>): string[] {
  const errors: string[] = [];
  for (const rel of doc.relationships) {
    collectMissingRelationColumns(errors, rel.id, entityById.get(rel.sourceEntityId), rel.sourceColumnIds, "source");
    collectMissingRelationColumns(errors, rel.id, entityById.get(rel.targetEntityId), rel.targetColumnIds, "target");
  }
  return errors;
}

function indexColumnErrors(doc: DiagramDocument, entityById: Map<string, DiagramEntity>): string[] {
  const errors: string[] = [];
  for (const idx of doc.indexes) {
    const entity = entityById.get(idx.entityId);
    if (!entity) {
      errors.push(`Index ${idx.name || idx.id} references missing table ${idx.entityId}.`);
      continue;
    }
    for (const cid of idx.columnIds) {
      if (!entity.columns.some((c) => c.id === cid)) {
        errors.push(`Index "${idx.name || idx.id}" references missing column ${cid} on "${entity.name}".`);
      }
    }
  }
  return errors;
}

/**
 * validateDiagram(format/관계 엔티티 참조)이 못 잡는 참조 무결성 오류를 추가로 수집한다.
 * AI가 만든 변경이 구조적으로 일관적인지 확인하는 용도(무할루시네이션 안전망).
 */
function extraIntegrityErrors(doc: DiagramDocument): string[] {
  const entityById = new Map(doc.entities.map((e) => [e.id, e]));
  return [
    ...duplicateColumnNameErrors(doc),
    ...relationshipColumnErrors(doc, entityById),
    ...indexColumnErrors(doc, entityById),
  ];
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
