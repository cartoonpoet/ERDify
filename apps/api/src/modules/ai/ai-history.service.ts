import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Cron, CronExpression } from "@nestjs/schedule";
import { LessThan, Repository } from "typeorm";
import { randomUUID } from "node:crypto";
import { AiConversation } from "@erdify/db";
import type { DiffChange } from "@erdify/contracts";
import type { AiSessionResponse } from "./dto/chat-stream.dto";
import type { ConvMessage } from "./providers/provider.types";

const HISTORY_LIMIT = 6;
const TTL_DAYS = 90;

function diffLabel(d: DiffChange): string {
  if ("tableName" in d) return d.tableName;
  if ("newName" in d) return `${d.oldName}->${d.newName}`;
  if ("fromTable" in d) return `${d.fromTable}->${d.toTable}`;
  return "";
}

/** 저장된 대화 행을 에이전트 루프용 ConvMessage[]로 복원. 과거 diff는 텍스트 요약으로(짝 없는 tool_use 방지). */
export function rowsToConvMessages(rows: AiConversation[]): ConvMessage[] {
  return rows.map((r): ConvMessage => {
    if (r.role === "user") return { role: "user", content: r.content };
    const diff = (r.diff as unknown as DiffChange[] | null) ?? [];
    const labels = diff.map(diffLabel).filter(Boolean);
    const summary = labels.length ? `\n[적용한 변경: ${labels.join(", ")}]` : "";
    return { role: "assistant", text: (r.content ?? "") + summary, toolCalls: [] };
  });
}

@Injectable()
export class AiHistoryService {
  private readonly logger = new Logger(AiHistoryService.name);

  constructor(
    @InjectRepository(AiConversation)
    private readonly repo: Repository<AiConversation>,
  ) {}

  async saveUserMessage(userId: string, diagramId: string | null, content: string, sessionId: string | null = null): Promise<AiConversation> {
    const entity = this.repo.create({
      id: randomUUID(),
      userId,
      diagramId,
      sessionId,
      role: "user",
      content,
      toolCalls: null,
      diff: null,
      accepted: null,
    });
    return this.repo.save(entity);
  }

  async saveAssistantMessage(
    userId: string,
    diagramId: string | null,
    content: string,
    diff: DiffChange[] | null,
    toolCalls: Record<string, unknown>[] | null,
    sessionId: string | null = null,
  ): Promise<AiConversation> {
    const entity = this.repo.create({
      id: randomUUID(),
      userId,
      diagramId,
      sessionId,
      role: "assistant",
      content,
      toolCalls: toolCalls as Record<string, unknown> | null,
      diff: diff as unknown as Record<string, unknown> | null,
      ...(diff !== null ? { accepted: null } : {}),
    });
    return this.repo.save(entity);
  }

  async findRecent(userId: string, diagramId: string | null, sessionId?: string | null): Promise<AiConversation[]> {
    if (sessionId) {
      // diagramId 조건 필수: 다른 다이어그램에서 재사용된 sessionId로 그 대화가 현재 다이어그램 컨텍스트에 섞이는 것을 방지
      const rows = await this.repo.find({
        where: { userId, sessionId, ...(diagramId !== null ? { diagramId } : {}) },
        order: { createdAt: "DESC" },
        take: HISTORY_LIMIT,
      });
      return rows.reverse();
    }

    const rows = await this.repo.find({
      where: { userId, ...(diagramId !== null ? { diagramId } : {}) },
      order: { createdAt: "DESC" },
      take: HISTORY_LIMIT,
    });
    return rows.reverse();
  }

  /** 에이전트 루프용: 세션별 최근 대화를 ConvMessage 턴으로 복원. */
  async findRecentTurns(userId: string, diagramId: string | null, sessionId?: string | null): Promise<ConvMessage[]> {
    const rows = await this.findRecent(userId, diagramId, sessionId);
    return rowsToConvMessages(rows);
  }

  async findSessions(userId: string, diagramId: string): Promise<AiSessionResponse[]> {
    const rows = await this.repo
      .createQueryBuilder("c")
      .select("c.session_id", "sessionId")
      .addSelect("MIN(c.created_at)", "createdAt")
      .addSelect(
        `(SELECT content FROM ai_conversations sub
           WHERE sub.session_id = c.session_id
             AND sub.user_id = :userId
             AND sub.role = 'user'
           ORDER BY sub.created_at ASC
           LIMIT 1)`,
        "firstName",
      )
      .where("c.user_id = :userId", { userId })
      .andWhere("c.diagram_id = :diagramId", { diagramId })
      .andWhere("c.session_id IS NOT NULL")
      .groupBy("c.session_id")
      .orderBy("MIN(c.created_at)", "DESC")
      .setParameter("userId", userId)
      .getRawMany<{ sessionId: string; createdAt: Date; firstName: string | null }>();

    return rows.map((row) => ({
      id: row.sessionId,
      diagramId,
      name: row.firstName ? row.firstName.slice(0, 30) : "새 세션",
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    }));
  }

  async createSession(_userId: string, _diagramId: string): Promise<string> {
    // 실제 DB 저장은 첫 메시지 저장 시 자동으로 이뤄진다
    return randomUUID();
  }

  async findSessionMessages(
    userId: string,
    sessionId: string,
    limit: number,
    beforeId?: string,
  ): Promise<{ messages: AiConversation[]; hasMore: boolean }> {
    let beforeCreatedAt: Date | undefined;

    if (beforeId) {
      const ref = await this.repo.findOne({ where: { id: beforeId, userId, sessionId } });
      if (ref) beforeCreatedAt = ref.createdAt;
    }

    const rows = await this.repo.find({
      where: {
        userId,
        sessionId,
        ...(beforeCreatedAt ? { createdAt: LessThan(beforeCreatedAt) } : {}),
      },
      order: { createdAt: "DESC" },
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const messages = rows.slice(0, limit).reverse();
    return { messages, hasMore };
  }

  async markAccepted(messageId: string, userId: string, accepted: boolean): Promise<void> {
    await this.repo.update({ id: messageId, userId }, { accepted });
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpired(): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - TTL_DAYS);
    const result = await this.repo.delete({ createdAt: LessThan(cutoff) });
    this.logger.log(`AI conversation cleanup: ${result.affected ?? 0} records deleted`);
  }
}
