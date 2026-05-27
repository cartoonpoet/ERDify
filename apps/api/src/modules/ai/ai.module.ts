import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrganizationAiSettings, AiConversation, Diagram, OrganizationMember } from "@erdify/db";
import { AuthModule } from "../auth/auth.module";
import { CommonModule } from "../../common/common.module";
import { UsageModule } from "../usage/usage.module";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { AiHistoryService } from "./ai-history.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrganizationAiSettings,
      AiConversation,
      Diagram,
      OrganizationMember,
    ]),
    AuthModule,
    CommonModule,
    UsageModule,
  ],
  controllers: [AiController],
  providers: [AiService, AiHistoryService],
})
export class AiModule {}
