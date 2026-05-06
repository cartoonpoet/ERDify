import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Diagram, DiagramVersion, McpSession, OrganizationMember, Project } from "@erdify/db";
import { AuthModule } from "../auth/auth.module";
import { CollaborationModule } from "../collaboration/collaboration.module";
import { PublicDiagramsController } from "./public-diagrams.controller";
import { DiagramsController } from "./diagrams.controller";
import { DiagramsService } from "./diagrams.service";
import { McpSessionsController } from "./mcp-sessions.controller";
import { McpSessionsService } from "./mcp-sessions.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Diagram, DiagramVersion, McpSession, Project, OrganizationMember]),
    AuthModule,
    CollaborationModule,
  ],
  controllers: [
    PublicDiagramsController,
    DiagramsController,
    McpSessionsController,
  ],
  providers: [DiagramsService, McpSessionsService],
  exports: [DiagramsService],
})
export class DiagramsModule {}
