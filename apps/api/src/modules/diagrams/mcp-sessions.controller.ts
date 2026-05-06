import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from "@nestjs/common";
import { FlexAuthGuard } from "../auth/guards/flex-auth.guard";
import { McpSessionsService } from "./mcp-sessions.service";
import { RecordToolCallDto } from "./dto/record-tool-call.dto";

@Controller("diagrams/:diagramId/mcp-sessions")
@UseGuards(FlexAuthGuard)
export class McpSessionsController {
  constructor(
    private readonly mcpSessionsService: McpSessionsService,
  ) {}

  @Post(":sessionId/tool-calls")
  @HttpCode(200)
  async recordToolCall(
    @Param("diagramId") diagramId: string,
    @Param("sessionId") sessionId: string,
    @Body() dto: RecordToolCallDto
  ) {
    await this.mcpSessionsService.recordToolCall(diagramId, sessionId, {
      tool: dto.tool,
      summary: dto.summary,
    });

    return { ok: true };
  }

  @Get()
  async listSessions(@Param("diagramId") diagramId: string) {
    return this.mcpSessionsService.listSessions(diagramId);
  }

  @Post(":sessionId/revert")
  @HttpCode(200)
  async revertSession(
    @Param("diagramId") diagramId: string,
    @Param("sessionId") sessionId: string
  ) {
    await this.mcpSessionsService.revertSession(diagramId, sessionId);
    return { ok: true };
  }
}
