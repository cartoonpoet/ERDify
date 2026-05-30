import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrganizationAiSettings, AiConversation, Diagram, OrganizationMember, User, Organization } from "@erdify/db";
import { AuthModule } from "../auth/auth.module";
import { CommonModule } from "../../common/common.module";
import { UsageModule } from "../usage/usage.module";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { AiHistoryService } from "./ai-history.service";
import { AiChatService } from "./chat/ai-chat.service";
import { ToolExecutor } from "./tools/tool-executor";
import { AnthropicProvider } from "./providers/anthropic.provider";
import { OpenAiProvider } from "./providers/openai.provider";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrganizationAiSettings,
      AiConversation,
      Diagram,
      OrganizationMember,
      User,
      Organization,
    ]),
    AuthModule,
    CommonModule,
    UsageModule,
  ],
  controllers: [AiController],
  providers: [AiService, AiHistoryService, AiChatService, ToolExecutor, AnthropicProvider, OpenAiProvider],
})
export class AiModule {}
