import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from "@nestjs/common";
import { FlexAuthGuard } from "../auth/guards/flex-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { JwtPayload } from "../auth/strategies/jwt.strategy";
import { McpSessionsService } from "./mcp-sessions.service";
import { RecordToolCallDto } from "./dto/record-tool-call.dto";

@Controller("diagrams/:diagramId/mcp-sessions")
@UseGuards(FlexAuthGuard)
export class McpSessionsController {
  constructor(
    private readonly mcpSessionsService: McpSessionsService,
  ) {}

  @Post(":sessionId/tool-calls")
  @HttpCode(HttpStatus.NO_CONTENT)
  async recordToolCall(
    @CurrentUser() user: JwtPayload,
    @Param("diagramId") diagramId: string,
    @Param("sessionId") sessionId: string,
    @Body() dto: RecordToolCallDto
  ): Promise<void> {
    await this.mcpSessionsService.recordToolCall(diagramId, sessionId, user.sub, {
      tool: dto.tool,
      summary: dto.summary,
    });
  }

  @Get()
  async listSessions(
    @CurrentUser() user: JwtPayload,
    @Param("diagramId") diagramId: string
  ) {
    return this.mcpSessionsService.listSessions(diagramId, user.sub);
  }

  @Post(":sessionId/revert")
  @HttpCode(HttpStatus.NO_CONTENT)
  async revertSession(
    @CurrentUser() user: JwtPayload,
    @Param("diagramId") diagramId: string,
    @Param("sessionId") sessionId: string
  ): Promise<void> {
    await this.mcpSessionsService.revertSession(diagramId, sessionId, user.sub);
  }
}
