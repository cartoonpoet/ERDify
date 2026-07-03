import { randomUUID } from "crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Diagram, Project } from "@erdify/db";
import type { Repository } from "typeorm";
import { AuthorizationService } from "../../../common/services/authorization.service";
import { DomainLoaderService } from "../../../common/services/domain-loader.service";
import type { DiagramColumn, DiagramDocument, DiagramRelationship } from "@erdify/domain";
import type { AddTableDto } from "../dto/add-table.dto";
import type { UpdateTableDto } from "../dto/update-table.dto";
import type { AddColumnDto } from "../dto/add-column.dto";
import type { UpdateColumnDto } from "../dto/update-column.dto";
import type { AddRelationshipDto } from "../dto/add-relationship.dto";
import type { UpdateRelationshipDto } from "../dto/update-relationship.dto";

@Injectable()
export class DiagramsSchemaService {
  constructor(
    @InjectRepository(Diagram)
    private readonly diagramRepo: Repository<Diagram>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly authorizationService: AuthorizationService,
    private readonly domainLoader: DomainLoaderService
  ) {}

  private async getDiagramWithOrg(diagramId: string): Promise<{ diagram: Diagram; orgId: string }> {
    const diagram = await this.diagramRepo.findOne({ where: { id: diagramId } });
    if (!diagram) throw new NotFoundException("Diagram not found");
    const project = await this.projectRepo.findOne({ where: { id: diagram.projectId } });
    if (!project) throw new NotFoundException("Project not found");
    return { diagram, orgId: project.organizationId };
  }

  private toDiagramDocument(content: object): DiagramDocument {
    const doc = content as unknown as DiagramDocument;
    if (!doc || !Array.isArray(doc.entities)) {
      throw new BadRequestException("Diagram content is malformed");
    }
    return doc;
  }

  private async applySchemaCommand(
    diagramId: string,
    userId: string,
    fn: (doc: DiagramDocument) => DiagramDocument
  ): Promise<Diagram> {
    const { diagram, orgId } = await this.getDiagramWithOrg(diagramId);
    await this.authorizationService.requireEditorOrOwner(orgId, userId);
    const doc = this.toDiagramDocument(diagram.content);
    diagram.content = fn(doc) as unknown as object;
    return this.diagramRepo.save(diagram);
  }

  async addTable(diagramId: string, userId: string, dto: AddTableDto): Promise<Diagram> {
    const domain = await this.domainLoader.load();
    const entityId = randomUUID();
    const hasPosition = dto.x !== undefined && dto.y !== undefined;
    return this.applySchemaCommand(diagramId, userId, (doc) =>
      domain.addEntity(doc, {
        id: entityId,
        name: dto.name,
        ...(hasPosition ? { position: { x: dto.x!, y: dto.y! } } : {}),
      })
    );
  }

  async updateTable(diagramId: string, tableId: string, userId: string, dto: UpdateTableDto): Promise<Diagram> {
    const domain = await this.domainLoader.load();
    return this.applySchemaCommand(diagramId, userId, (doc) => {
      if (!doc.entities.some((e) => e.id === tableId)) throw new NotFoundException("Table not found");
      let updated = doc;
      if (dto.name !== undefined) updated = domain.renameEntity(updated, tableId, dto.name);
      if (dto.color !== undefined) updated = domain.updateEntityColor(updated, tableId, dto.color ?? null);
      if (dto.comment !== undefined) updated = domain.updateEntityComment(updated, tableId, dto.comment ?? null);
      return updated;
    });
  }

  async removeTable(diagramId: string, tableId: string, userId: string): Promise<void> {
    const domain = await this.domainLoader.load();
    await this.applySchemaCommand(diagramId, userId, (doc) => {
      if (!doc.entities.some((e) => e.id === tableId)) throw new NotFoundException("Table not found");
      return domain.removeEntity(doc, tableId);
    });
  }

  async addColumn(diagramId: string, tableId: string, userId: string, dto: AddColumnDto): Promise<Diagram> {
    const domain = await this.domainLoader.load();
    return this.applySchemaCommand(diagramId, userId, (doc) => {
      const entity = doc.entities.find((e) => e.id === tableId);
      if (!entity) throw new NotFoundException("Table not found");
      const column: DiagramColumn = {
        id: randomUUID(),
        name: dto.name,
        type: dto.type,
        nullable: dto.nullable ?? true,
        primaryKey: dto.primaryKey ?? false,
        unique: dto.unique ?? false,
        defaultValue: dto.defaultValue ?? null,
        comment: dto.comment ?? null,
        autoIncrement: dto.autoIncrement ?? false,
        ordinal: entity.columns.length,
      };
      return domain.addColumn(doc, tableId, column);
    });
  }

  async updateColumn(
    diagramId: string,
    tableId: string,
    columnId: string,
    userId: string,
    dto: UpdateColumnDto
  ): Promise<Diagram> {
    const domain = await this.domainLoader.load();
    return this.applySchemaCommand(diagramId, userId, (doc) => {
      const entity = doc.entities.find((e) => e.id === tableId);
      if (!entity) throw new NotFoundException("Table not found");
      if (!entity.columns.some((c) => c.id === columnId)) throw new NotFoundException("Column not found");
      const changes: Partial<Omit<DiagramColumn, "id">> = {};
      if (dto.name !== undefined) changes.name = dto.name;
      if (dto.type !== undefined) changes.type = dto.type;
      if (dto.nullable !== undefined) changes.nullable = dto.nullable;
      if (dto.primaryKey !== undefined) changes.primaryKey = dto.primaryKey;
      if (dto.unique !== undefined) changes.unique = dto.unique;
      if (dto.defaultValue !== undefined) changes.defaultValue = dto.defaultValue ?? null;
      if (dto.comment !== undefined) changes.comment = dto.comment ?? null;
      if (dto.autoIncrement !== undefined) changes.autoIncrement = dto.autoIncrement;
      return domain.updateColumn(doc, tableId, columnId, changes);
    });
  }

  async removeColumn(diagramId: string, tableId: string, columnId: string, userId: string): Promise<void> {
    const domain = await this.domainLoader.load();
    await this.applySchemaCommand(diagramId, userId, (doc) => {
      const entity = doc.entities.find((e) => e.id === tableId);
      if (!entity) throw new NotFoundException("Table not found");
      if (!entity.columns.some((c) => c.id === columnId)) throw new NotFoundException("Column not found");
      return domain.removeColumn(doc, tableId, columnId);
    });
  }

  async addRelationship(diagramId: string, userId: string, dto: AddRelationshipDto): Promise<Diagram> {
    const domain = await this.domainLoader.load();
    const relationship: DiagramRelationship = {
      id: randomUUID(),
      name: "",
      sourceEntityId: dto.sourceEntityId,
      sourceColumnIds: dto.sourceColumnIds,
      targetEntityId: dto.targetEntityId,
      targetColumnIds: dto.targetColumnIds,
      cardinality: dto.cardinality,
      onDelete: dto.onDelete ?? "no-action",
      onUpdate: dto.onUpdate ?? "no-action",
      identifying: dto.identifying ?? false,
    };
    return this.applySchemaCommand(diagramId, userId, (doc) => domain.addRelationship(doc, relationship));
  }

  async updateRelationship(
    diagramId: string,
    relId: string,
    userId: string,
    dto: UpdateRelationshipDto
  ): Promise<Diagram> {
    const domain = await this.domainLoader.load();
    return this.applySchemaCommand(diagramId, userId, (doc) => {
      if (!doc.relationships.some((r) => r.id === relId)) throw new NotFoundException("Relationship not found");
      const changes: Partial<Omit<DiagramRelationship, "id">> = {};
      if (dto.sourceColumnIds !== undefined) changes.sourceColumnIds = dto.sourceColumnIds;
      if (dto.targetColumnIds !== undefined) changes.targetColumnIds = dto.targetColumnIds;
      if (dto.cardinality !== undefined) changes.cardinality = dto.cardinality;
      if (dto.onDelete !== undefined) changes.onDelete = dto.onDelete;
      if (dto.onUpdate !== undefined) changes.onUpdate = dto.onUpdate;
      if (dto.identifying !== undefined) changes.identifying = dto.identifying;
      return domain.updateRelationship(doc, relId, changes);
    });
  }

  async removeRelationship(diagramId: string, relId: string, userId: string): Promise<void> {
    const domain = await this.domainLoader.load();
    await this.applySchemaCommand(diagramId, userId, (doc) => {
      if (!doc.relationships.some((r) => r.id === relId)) throw new NotFoundException("Relationship not found");
      return domain.removeRelationship(doc, relId);
    });
  }
}
