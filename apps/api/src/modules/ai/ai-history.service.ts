import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Cron, CronExpression } from "@nestjs/schedule";
import { LessThan, Repository } from "typeorm";
import { randomUUID } from "node:crypto";
import { AiConversation } from "@erdify/db";
import type { DiffChange } from "@erdify/contracts";

const HISTORY_LIMIT = 6;
const TTL_DAYS = 90;

@Injectable()
export class AiHistoryService {
  private readonly logger = new Logger(AiHistoryService.name);

  constructor(
    @InjectRepository(AiConversation)
    private readonly repo: Repository<AiConversation>,
  ) {}

  async saveUserMessage(userId: string, diagramId: string | null, content: string): Promise<AiConversation> {
    const entity = this.repo.create({
      id: randomUUID(),
      userId,
      diagramId,
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
  ): Promise<AiConversation> {
    const entity = this.repo.create({
      id: randomUUID(),
      userId,
      diagramId,
      role: "assistant",
      content,
      toolCalls: toolCalls as Record<string, unknown> | null,
      diff: diff as unknown as Record<string, unknown> | null,
      ...(diff !== null ? { accepted: null } : {}),
    });
    return this.repo.save(entity);
  }

  async findRecent(userId: string, diagramId: string | null): Promise<AiConversation[]> {
    const rows = await this.repo.find({
      where: { userId, ...(diagramId !== null ? { diagramId } : {}) },
      order: { createdAt: "DESC" },
      take: HISTORY_LIMIT,
    });
    return rows.reverse();
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
