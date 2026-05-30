import { Body, Controller, Param, Post, Get, Put, UseGuards, Res } from "@nestjs/common";
import type { Response } from "express";
import { FlexAuthGuard } from "../auth/guards/flex-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { JwtPayload } from "../auth/strategies/jwt.strategy";
import { AiService } from "./ai.service";
import { AiChatService } from "./chat/ai-chat.service";
import { AiHistoryService } from "./ai-history.service";
import { AiChatStreamDto } from "./dto/chat-stream.dto";
import { AiSuggestColumnsDto } from "./dto/suggest-columns.dto";
import type { AiStreamEvent, AiChatHistoryMessage, ColumnSuggestion, OrgAiSettings } from "@erdify/contracts";

@Controller()
@UseGuards(FlexAuthGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly aiChatService: AiChatService,
    private readonly aiHistoryService: AiHistoryService,
  ) {}

  @Post("ai/chat/stream")
  async chatStream(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AiChatStreamDto,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    let aborted = false;
    res.on("close", () => {
      aborted = true;
    });

    const write = (e: AiStreamEvent): void => {
      res.write(`data: ${JSON.stringify(e)}\n\n`);
      (res as Response & { flush?: () => void }).flush?.();
    };

    await this.aiChatService.runChat(
      {
        userId: user.sub,
        diagramId: dto.diagramId,
        message: dto.message,
        enableReadTools: dto.enableReadTools ?? false,
        isAborted: () => aborted,
      },
      write,
    );
    res.end();
  }

  @Get("ai/chat/history/:diagramId")
  chatHistory(
    @CurrentUser() user: JwtPayload,
    @Param("diagramId") diagramId: string,
  ): Promise<AiChatHistoryMessage[]> {
    return this.aiHistoryService.findForDiagram(user.sub, diagramId);
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
    @Body() body: { apiKey: string; provider: "anthropic" | "openai" | "gemini"; model?: string },
  ): Promise<void> {
    return this.aiService.updateOrgAiSettings(orgId, user.sub, body.apiKey, body.provider, body.model ?? "");
  }
}
