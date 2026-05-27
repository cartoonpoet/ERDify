import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Diagram, DiagramVersion, McpSession, Organization, Project, User } from "@erdify/db";
import { AuthModule } from "../auth/auth.module";
import { CommonModule } from "../../common/common.module";
import { CollaborationModule } from "../collaboration/collaboration.module";
import { PublicDiagramsController } from "./public-diagrams.controller";
import { DiagramsController } from "./diagrams.controller";
import { DiagramsService } from "./diagrams.service";
import { DiagramsCrudService } from "./services/diagrams-crud.service";
import { DiagramsSchemaService } from "./services/diagrams-schema.service";
import { DiagramsVersionService } from "./services/diagrams-version.service";
import { DiagramsShareService } from "./services/diagrams-share.service";
import { McpSessionsController } from "./mcp-sessions.controller";
import { McpSessionsService } from "./mcp-sessions.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Diagram, DiagramVersion, McpSession, Organization, Project, User]),
    AuthModule,
    CommonModule,
    forwardRef(() => CollaborationModule),
  ],
  controllers: [PublicDiagramsController, DiagramsController, McpSessionsController],
  providers: [
    DiagramsCrudService,
    DiagramsSchemaService,
    DiagramsVersionService,
    DiagramsShareService,
    DiagramsService,
    McpSessionsService,
  ],
  exports: [DiagramsService],
})
export class DiagramsModule {}
