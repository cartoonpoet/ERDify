import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Diagram, DiagramVersion, OrganizationMember, Project } from "@erdify/db";
import { DiagramsController } from "./diagrams.controller";
import { DiagramsService } from "./diagrams.service";

@Module({
  imports: [TypeOrmModule.forFeature([Diagram, DiagramVersion, Project, OrganizationMember])],
  controllers: [DiagramsController],
  providers: [DiagramsService]
})
export class DiagramsModule {}
