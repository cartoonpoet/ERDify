import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Announcement, User } from "@erdify/db";
import { AnnouncementsService } from "./announcements.service";
import { AnnouncementsAiService } from "./announcements-ai.service";
import { AnnouncementsController } from "./announcements.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Announcement, User])],
  providers: [AnnouncementsService, AnnouncementsAiService],
  controllers: [AnnouncementsController],
})
export class AnnouncementsModule {}
