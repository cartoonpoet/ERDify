import { Body, Controller, HttpCode, Param, Post, Get, Put, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { FlexAuthGuard } from "../auth/guards/flex-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { JwtPayload } from "../auth/strategies/jwt.strategy";
import { AiService } from "./ai.service";
import { AiHistoryService } from "./ai-history.service";
import { AiChatDto } from "./dto/chat.dto";
import { AiSuggestColumnsDto } from "./dto/suggest-columns.dto";
import { AiChatStreamDto, AiCreateSessionDto } from "./dto/chat-stream.dto";
import type { AiSessionResponse } from "./dto/chat-stream.dto";
import type { AiChatResponse, ColumnSuggestion, OrgAiSettings } from "@erdify/contracts";

@Controller()
@UseGuards(FlexAuthGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly aiHistoryService: AiHistoryService,
  ) {}

  @Post("ai/chat")
  chat(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AiChatDto,
  ): Promise<AiChatResponse> {
    return this.aiService.chat(user.sub, dto.diagramId, dto.message);
  }

  @Post("ai/chat/stream")
  @HttpCode(200)
  async chatStream(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AiChatStreamDto,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    try {
      for await (const ev of this.aiService.chatStream(
        user.sub,
        dto.diagramId,
        dto.message,
        dto.sessionId ?? null,
      )) {
        if (ev.event === "text") {
          res.write("event: text\ndata: " + JSON.stringify({ delta: ev.delta }) + "\n\n");
        } else if (ev.event === "done") {
          res.write("event: done\ndata: " + JSON.stringify({ messageId: ev.messageId, diff: ev.diff, pendingDocument: ev.pendingDocument }) + "\n\n");
        } else if (ev.event === "error") {
          res.write("event: error\ndata: " + JSON.stringify({ message: ev.message }) + "\n\n");
        }
      }
    } finally {
      res.end();
    }
  }

  @Get("ai/sessions")
  getSessions(
    @CurrentUser() user: JwtPayload,
    @Query("diagramId") diagramId: string,
  ): Promise<AiSessionResponse[]> {
    return this.aiHistoryService.findSessions(user.sub, diagramId);
  }

  @Post("ai/sessions")
  async createSession(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AiCreateSessionDto,
  ): Promise<{ sessionId: string }> {
    const sessionId = await this.aiHistoryService.createSession(user.sub, dto.diagramId);
    return { sessionId };
  }

  @Post("ai/chat/:messageId/accept")
  acceptDiff(
    @CurrentUser() user: JwtPayload,
    @Param("messageId") messageId: string,
  ): Promise<void> {
    return this.aiHistoryService.markAccepted(messageId, user.sub, true);
  }

  @Post("ai/chat/:messageId/reject")
  rejectDiff(
    @CurrentUser() user: JwtPayload,
    @Param("messageId") messageId: string,
  ): Promise<void> {
    return this.aiHistoryService.markAccepted(messageId, user.sub, false);
  }

  @Post("ai/suggest-columns")
  suggestColumns(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AiSuggestColumnsDto,
  ): Promise<ColumnSuggestion[]> {
    return this.aiService.suggestColumns(user.sub, dto.tableName, dto.existingColumns);
  }

  @Get("organizations/:orgId/ai-settings")
  getOrgAiSettings(
    @CurrentUser() user: JwtPayload,
    @Param("orgId") orgId: string,
  ): Promise<OrgAiSettings> {
    return this.aiService.getOrgAiSettings(orgId, user.sub);
  }

  @Put("organizations/:orgId/ai-settings")
  updateOrgAiSettings(
    @CurrentUser() user: JwtPayload,
    @Param("orgId") orgId: string,
    @Body() body: { apiKey: string; provider: "anthropic" | "openai"; model?: string },
  ): Promise<void> {
    return this.aiService.updateOrgAiSettings(orgId, user.sub, body.apiKey, body.provider, body.model ?? "");
  }
}
