import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UsageLog } from "@erdify/db";
import { UsageService } from "./usage.service";

@Module({
  imports: [TypeOrmModule.forFeature([UsageLog])],
  providers: [UsageService],
  exports: [UsageService],
})
export class UsageModule {}
