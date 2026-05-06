import { randomUUID } from "crypto";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Diagram, DiagramVersion, McpSession } from "@erdify/db";
import type { Repository } from "typeorm";

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
    private readonly versionRepo: Repository<DiagramVersion>
  ) {}

  async recordToolCall(
    diagramId: string,
    sessionId: string,
    entry: ToolCallEntry
  ): Promise<McpSession> {
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

    return this.sessionRepo.save(session);
  }

  async listSessions(diagramId: string): Promise<McpSessionResponse[]> {
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

  async revertSession(diagramId: string, sessionId: string): Promise<void> {
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
