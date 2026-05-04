import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrganizationMember, Project } from "@erdify/db";
import { AuthModule } from "../auth/auth.module";
import { ProjectController } from "./project.controller";
import { ProjectService } from "./project.service";

@Module({
  imports: [TypeOrmModule.forFeature([Project, OrganizationMember]), AuthModule],
  controllers: [ProjectController],
  providers: [ProjectService]
})
export class ProjectModule {}
