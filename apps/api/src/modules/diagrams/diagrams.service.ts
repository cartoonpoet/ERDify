import { Inject, Injectable, forwardRef } from "@nestjs/common";
import type { Diagram, DiagramVersion } from "@erdify/db";
import type { CreateDiagramDto } from "./dto/create-diagram.dto";
import type { UpdateDiagramDto } from "./dto/update-diagram.dto";
import type { SharePreset } from "./dto/share-diagram.dto";
import type { AddTableDto } from "./dto/add-table.dto";
import type { UpdateTableDto } from "./dto/update-table.dto";
import type { AddColumnDto } from "./dto/add-column.dto";
import type { UpdateColumnDto } from "./dto/update-column.dto";
import type { AddRelationshipDto } from "./dto/add-relationship.dto";
import type { UpdateRelationshipDto } from "./dto/update-relationship.dto";
import type { DuplicateDiagramDto } from "./dto/duplicate-diagram.dto";
import type { MoveDiagramDto } from "./dto/move-diagram.dto";
import type { ActiveUsersResponse } from "@erdify/contracts";
import { DiagramsCrudService } from "./services/diagrams-crud.service";
import { DiagramsSchemaService } from "./services/diagrams-schema.service";
import { DiagramsVersionService } from "./services/diagrams-version.service";
import type { DiagramVersionWithName } from "./services/diagrams-version.service";
import { DiagramsShareService } from "./services/diagrams-share.service";
import { CollaborationService } from "../collaboration/collaboration.service";

@Injectable()
export class DiagramsService {
  constructor(
    private readonly crud: DiagramsCrudService,
    private readonly schema: DiagramsSchemaService,
    private readonly version: DiagramsVersionService,
    private readonly share: DiagramsShareService,
    @Inject(forwardRef(() => CollaborationService))
    private readonly collaborationService: CollaborationService
  ) {}

  create(projectId: string, userId: string, dto: CreateDiagramDto): Promise<Diagram> {
    return this.crud.create(projectId, userId, dto);
  }

  findAll(projectId: string, userId: string) {
    return this.crud.findAll(projectId, userId);
  }

  findOne(diagramId: string, userId: string): Promise<Diagram & { organizationId: string; myRole: string }> {
    return this.crud.findOne(diagramId, userId);
  }

  update(diagramId: string, userId: string, dto: UpdateDiagramDto): Promise<Diagram> {
    return this.crud.update(diagramId, userId, dto);
  }

  remove(diagramId: string, userId: string): Promise<void> {
    return this.crud.remove(diagramId, userId);
  }

  duplicate(diagramId: string, userId: string, dto?: DuplicateDiagramDto) {
    return this.crud.duplicate(diagramId, userId, dto);
  }

  move(diagramId: string, userId: string, dto: MoveDiagramDto) {
    return this.crud.move(diagramId, userId, dto);
  }

  canAccessDiagram(diagramId: string, userId: string): Promise<boolean> {
    return this.crud.canAccessDiagram(diagramId, userId);
  }

  assertReadAccess(diagramId: string, userId: string): Promise<void> {
    return this.crud.assertReadAccess(diagramId, userId);
  }

  assertEditorAccess(diagramId: string, userId: string): Promise<void> {
    return this.crud.assertEditorAccess(diagramId, userId);
  }

  saveVersion(diagramId: string, userId: string): Promise<DiagramVersion> {
    return this.version.saveVersion(diagramId, userId);
  }

  findVersions(diagramId: string, userId: string): Promise<DiagramVersionWithName[]> {
    return this.version.findVersions(diagramId, userId);
  }

  restoreVersion(diagramId: string, versionId: string, userId: string): Promise<Diagram> {
    return this.version.restoreVersion(diagramId, versionId, userId);
  }

  generateShareLink(diagramId: string, userId: string, preset: SharePreset): Promise<{ shareToken: string; expiresAt: Date }> {
    return this.share.generateShareLink(diagramId, userId, preset);
  }

  revokeShareLink(diagramId: string, userId: string): Promise<void> {
    return this.share.revokeShareLink(diagramId, userId);
  }

  getPublicDiagram(shareToken: string): Promise<{ id: string; name: string; content: object }> {
    return this.share.getPublicDiagram(shareToken);
  }

  addTable(diagramId: string, userId: string, dto: AddTableDto): Promise<Diagram> {
    return this.schema.addTable(diagramId, userId, dto);
  }

  updateTable(diagramId: string, tableId: string, userId: string, dto: UpdateTableDto): Promise<Diagram> {
    return this.schema.updateTable(diagramId, tableId, userId, dto);
  }

  removeTable(diagramId: string, tableId: string, userId: string): Promise<void> {
    return this.schema.removeTable(diagramId, tableId, userId);
  }

  addColumn(diagramId: string, tableId: string, userId: string, dto: AddColumnDto): Promise<Diagram> {
    return this.schema.addColumn(diagramId, tableId, userId, dto);
  }

  updateColumn(diagramId: string, tableId: string, columnId: string, userId: string, dto: UpdateColumnDto): Promise<Diagram> {
    return this.schema.updateColumn(diagramId, tableId, columnId, userId, dto);
  }

  removeColumn(diagramId: string, tableId: string, columnId: string, userId: string): Promise<void> {
    return this.schema.removeColumn(diagramId, tableId, columnId, userId);
  }

  addRelationship(diagramId: string, userId: string, dto: AddRelationshipDto): Promise<Diagram> {
    return this.schema.addRelationship(diagramId, userId, dto);
  }

  updateRelationship(diagramId: string, relId: string, userId: string, dto: UpdateRelationshipDto): Promise<Diagram> {
    return this.schema.updateRelationship(diagramId, relId, userId, dto);
  }

  removeRelationship(diagramId: string, relId: string, userId: string): Promise<void> {
    return this.schema.removeRelationship(diagramId, relId, userId);
  }

  async getActiveUsers(diagramIds: string[], userId: string): Promise<ActiveUsersResponse> {
    const accessChecks = await Promise.all(
      diagramIds.map(async (id) => ({
        id,
        allowed: await this.canAccessDiagram(id, userId),
      }))
    );
    const allowedIds = accessChecks.filter((c) => c.allowed).map((c) => c.id);
    return this.collaborationService.getRoomPresences(allowedIds);
  }
}
