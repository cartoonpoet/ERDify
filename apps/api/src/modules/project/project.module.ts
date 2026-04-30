import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrganizationMember, Project } from "@erdify/db";
import { ProjectController } from "./project.controller";
import { ProjectService } from "./project.service";

@Module({
  imports: [TypeOrmModule.forFeature([Project, OrganizationMember])],
  controllers: [ProjectController],
  providers: [ProjectService]
})
export class ProjectModule {}
