import { randomUUID } from "crypto";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Diagram, DiagramVersion, McpSession } from "@erdify/db";
import type { Repository } from "typeorm";
import { DiagramsService } from "./diagrams.service";

export interface ToolCallEntry {
  tool: string;
  summary: string;
}

export interface McpSessionResponse {
  id: string;
  summary: string | null;
  toolCalls: ToolCallEntry[];
  snapshotVersionId: string | null;
  createdAt: string;
  updatedAt: string;
}

// DB column allows 500 chars; we truncate at 200 per spec for display clarity
function buildSummary(toolCalls: ToolCallEntry[]): string {
  const full = toolCalls.map((t) => t.summary).join(", ");
  return full.length > 200 ? full.slice(0, 199) + "…" : full;
}

@Injectable()
export class McpSessionsService {
  constructor(
    @InjectRepository(McpSession)
    private readonly sessionRepo: Repository<McpSession>,
    @InjectRepository(Diagram)
    private readonly diagramRepo: Repository<Diagram>,
    @InjectRepository(DiagramVersion)
    private readonly versionRepo: Repository<DiagramVersion>,
    private readonly eventEmitter: EventEmitter2,
    private readonly diagramsService: DiagramsService
  ) {}

  async recordToolCall(
    diagramId: string,
    sessionId: string,
    userId: string,
    entry: ToolCallEntry
  ): Promise<McpSession> {
    await this.diagramsService.assertEditorAccess(diagramId, userId);

    let session = await this.sessionRepo.findOne({ where: { id: sessionId, diagramId } });

    if (!session) {
      // First tool call: snapshot current diagram state
      const diagram = await this.diagramRepo.findOne({ where: { id: diagramId } });
      if (!diagram) throw new NotFoundException("Diagram not found");

      const last = await this.versionRepo.findOne({
        where: { diagramId },
        order: { revision: "DESC" },
      });
      const revision = (last?.revision ?? 0) + 1;
      const version = await this.versionRepo.save(
        this.versionRepo.create({
          id: randomUUID(),
          diagramId,
          content: diagram.content,
          revision,
          createdBy: "mcp",
        })
      );

      session = this.sessionRepo.create({
        id: sessionId,
        diagramId,
        toolCalls: [entry],
        summary: buildSummary([entry]),
        snapshotVersionId: version.id,
      });
    } else {
      const toolCalls = [...session.toolCalls, entry];
      session.toolCalls = toolCalls;
      session.summary = buildSummary(toolCalls);
    }

    const saved = await this.sessionRepo.save(session);
    this.eventEmitter.emit("mcp.tool_call.recorded", {
      diagramId,
      sessionId,
      summary: saved.summary ?? entry.summary,
      toolCall: { tool: entry.tool, summary: entry.summary },
    });
    return saved;
  }

  async listSessions(diagramId: string, userId: string): Promise<McpSessionResponse[]> {
    await this.diagramsService.assertReadAccess(diagramId, userId);

    const sessions = await this.sessionRepo.find({
      where: { diagramId },
      order: { createdAt: "DESC" },
      take: 50,
    });
    return sessions.map((s) => ({
      id: s.id,
      summary: s.summary,
      toolCalls: s.toolCalls,
      snapshotVersionId: s.snapshotVersionId,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));
  }

  async revertSession(diagramId: string, sessionId: string, userId: string): Promise<void> {
    await this.diagramsService.assertEditorAccess(diagramId, userId);

    const session = await this.sessionRepo.findOne({ where: { id: sessionId, diagramId } });
    if (!session) throw new NotFoundException("Session not found");
    if (!session.snapshotVersionId) throw new NotFoundException("No snapshot for this session");

    const version = await this.versionRepo.findOne({
      where: { id: session.snapshotVersionId, diagramId },
    });
    if (!version) throw new NotFoundException("Snapshot version not found");

    const diagram = await this.diagramRepo.findOne({ where: { id: diagramId } });
    if (!diagram) throw new NotFoundException("Diagram not found");

    diagram.content = version.content;
    await this.diagramRepo.save(diagram);
  }
}
