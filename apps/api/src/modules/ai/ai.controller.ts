import { Body, Controller, Param, Post, Get, Put, UseGuards } from "@nestjs/common";
import { FlexAuthGuard } from "../auth/guards/flex-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { JwtPayload } from "../auth/strategies/jwt.strategy";
import { AiService } from "./ai.service";
import { AiHistoryService } from "./ai-history.service";
import { AiChatDto } from "./dto/chat.dto";
import { AiSuggestColumnsDto } from "./dto/suggest-columns.dto";
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
    @Body("apiKey") apiKey: string,
  ): Promise<void> {
    return this.aiService.updateOrgAiSettings(orgId, user.sub, apiKey);
  }
}
