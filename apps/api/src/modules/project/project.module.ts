import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Project } from "@erdify/db";
import { AuthModule } from "../auth/auth.module";
import { CommonModule } from "../../common/common.module";
import { UsageModule } from "../usage/usage.module";
import { ProjectController } from "./project.controller";
import { ProjectService } from "./project.service";

@Module({
  imports: [TypeOrmModule.forFeature([Project]), AuthModule, CommonModule, UsageModule],
  controllers: [ProjectController],
  providers: [ProjectService],
})
export class ProjectModule {}
