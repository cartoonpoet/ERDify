import { randomUUID } from "crypto";
import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Diagram, DiagramVersion, OrganizationMember, Project } from "@erdify/db";
import type { Repository } from "typeorm";
import type { CreateDiagramDto } from "./dto/create-diagram.dto";
import type { UpdateDiagramDto } from "./dto/update-diagram.dto";
import type { SharePreset } from "./dto/share-diagram.dto";
import {
  addEntity, renameEntity, updateEntityColor, updateEntityComment, removeEntity,
  addColumn as domainAddColumn,
  updateColumn as domainUpdateColumn,
  removeColumn as domainRemoveColumn,
} from "@erdify/domain";
import type { DiagramColumn, DiagramDocument } from "@erdify/domain";
import type { AddTableDto } from "./dto/add-table.dto";
import type { UpdateTableDto } from "./dto/update-table.dto";
import type { AddColumnDto } from "./dto/add-column.dto";
import type { UpdateColumnDto } from "./dto/update-column.dto";

@Injectable()
export class DiagramsService {
  constructor(
    @InjectRepository(Diagram)
    private readonly diagramRepo: Repository<Diagram>,
    @InjectRepository(DiagramVersion)
    private readonly versionRepo: Repository<DiagramVersion>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(OrganizationMember)
    private readonly memberRepo: Repository<OrganizationMember>
  ) {}

  private async getProject(projectId: string): Promise<Project> {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException("Project not found");
    return project;
  }

  private async requireMember(orgId: string, userId: string) {
    const m = await this.memberRepo.findOne({ where: { organizationId: orgId, userId } });
    if (!m) throw new ForbiddenException();
    return m;
  }

  private async requireEditorOrOwner(orgId: string, userId: string) {
    const m = await this.requireMember(orgId, userId);
    if (m.role === "viewer") throw new ForbiddenException();
    return m;
  }

  private async getDiagramWithOrg(diagramId: string): Promise<{ diagram: Diagram; orgId: string }> {
    const diagram = await this.diagramRepo.findOne({ where: { id: diagramId } });
    if (!diagram) throw new NotFoundException("Diagram not found");
    const project = await this.getProject(diagram.projectId);
    return { diagram, orgId: project.organizationId };
  }

  private async applySchemaCommand(
    diagramId: string,
    userId: string,
    fn: (doc: DiagramDocument) => DiagramDocument
  ): Promise<Diagram> {
    const { diagram, orgId } = await this.getDiagramWithOrg(diagramId);
    await this.requireEditorOrOwner(orgId, userId);
    const doc = diagram.content as unknown as DiagramDocument;
    if (!doc || !Array.isArray(doc.entities)) {
      throw new NotFoundException("Diagram content is malformed");
    }
    diagram.content = fn(doc) as unknown as object;
    return this.diagramRepo.save(diagram);
  }

  async create(projectId: string, userId: string, dto: CreateDiagramDto): Promise<Diagram> {
    const project = await this.getProject(projectId);
    await this.requireEditorOrOwner(project.organizationId, userId);
    const now = new Date().toISOString();
    const id = randomUUID();
    const content: object = dto.content
      ? { ...(dto.content as object), id }
      : {
          format: "erdify.schema.v1",
          id,
          name: dto.name,
          dialect: dto.dialect,
          entities: [],
          relationships: [],
          indexes: [],
          views: [],
          layout: { entityPositions: {} },
          metadata: { revision: 1, stableObjectIds: true, createdAt: now, updatedAt: now }
        };
    return this.diagramRepo.save(this.diagramRepo.create({ id, projectId, name: dto.name, content, createdBy: userId }));
  }

  async findAll(projectId: string, userId: string): Promise<Diagram[]> {
    const project = await this.getProject(projectId);
    await this.requireMember(project.organizationId, userId);
    return this.diagramRepo.find({ where: { projectId } });
  }

  async findOne(diagramId: string, userId: string): Promise<Diagram & { organizationId: string; myRole: string }> {
    const { diagram, orgId } = await this.getDiagramWithOrg(diagramId);
    const member = await this.requireMember(orgId, userId);
    return { ...diagram, organizationId: orgId, myRole: member.role };
  }

  async canAccessDiagram(diagramId: string, userId: string): Promise<boolean> {
    try {
      const { orgId } = await this.getDiagramWithOrg(diagramId);
      await this.requireMember(orgId, userId);
      return true;
    } catch {
      return false;
    }
  }

  async update(diagramId: string, userId: string, dto: UpdateDiagramDto): Promise<Diagram> {
    const { diagram, orgId } = await this.getDiagramWithOrg(diagramId);
    await this.requireEditorOrOwner(orgId, userId);
    Object.assign(diagram, dto);
    return this.diagramRepo.save(diagram);
  }

  async saveVersion(diagramId: string, userId: string): Promise<DiagramVersion> {
    const { diagram, orgId } = await this.getDiagramWithOrg(diagramId);
    await this.requireEditorOrOwner(orgId, userId);
    const last = await this.versionRepo.findOne({
      where: { diagramId },
      order: { revision: "DESC" }
    });
    const revision = (last?.revision ?? 0) + 1;
    return this.versionRepo.save(
      this.versionRepo.create({ id: randomUUID(), diagramId, content: diagram.content, revision, createdBy: userId })
    );
  }

  async findVersions(diagramId: string, userId: string): Promise<DiagramVersion[]> {
    const { orgId } = await this.getDiagramWithOrg(diagramId);
    await this.requireMember(orgId, userId);
    return this.versionRepo.find({ where: { diagramId }, order: { revision: "DESC" } });
  }

  async restoreVersion(diagramId: string, versionId: string, userId: string): Promise<Diagram> {
    const { diagram, orgId } = await this.getDiagramWithOrg(diagramId);
    await this.requireEditorOrOwner(orgId, userId);

    const version = await this.versionRepo.findOne({ where: { id: versionId, diagramId } });
    if (!version) throw new NotFoundException("Version not found");

    diagram.content = version.content;
    return this.diagramRepo.save(diagram);
  }

  async remove(diagramId: string, userId: string): Promise<void> {
    const { diagram, orgId } = await this.getDiagramWithOrg(diagramId);
    await this.requireEditorOrOwner(orgId, userId);
    await this.diagramRepo.remove(diagram);
  }

  private static presetToMs: Record<SharePreset, number> = {
    "1h": 3_600_000,
    "1d": 86_400_000,
    "7d": 604_800_000,
    "30d": 2_592_000_000,
  };

  async generateShareLink(
    diagramId: string,
    userId: string,
    preset: SharePreset
  ): Promise<{ shareToken: string; expiresAt: Date }> {
    const { diagram, orgId } = await this.getDiagramWithOrg(diagramId);
    await this.requireEditorOrOwner(orgId, userId);

    const shareToken = randomUUID();
    const expiresAt = new Date(Date.now() + DiagramsService.presetToMs[preset]);
    diagram.shareToken = shareToken;
    diagram.shareExpiresAt = expiresAt;
    await this.diagramRepo.save(diagram);

    return { shareToken, expiresAt };
  }

  async revokeShareLink(diagramId: string, userId: string): Promise<void> {
    const { diagram, orgId } = await this.getDiagramWithOrg(diagramId);
    await this.requireEditorOrOwner(orgId, userId);

    diagram.shareToken = null;
    diagram.shareExpiresAt = null;
    await this.diagramRepo.save(diagram);
  }

  async getPublicDiagram(shareToken: string): Promise<{ id: string; name: string; content: object }> {
    const diagram = await this.diagramRepo.findOne({ where: { shareToken } });
    if (!diagram) throw new NotFoundException("Share link not found");
    if (!diagram.shareExpiresAt || diagram.shareExpiresAt < new Date()) {
      throw new ForbiddenException("SHARE_LINK_EXPIRED");
    }
    return { id: diagram.id, name: diagram.name, content: diagram.content };
  }

  async addTable(diagramId: string, userId: string, dto: AddTableDto): Promise<Diagram> {
    const entityId = randomUUID();
    const hasPosition = dto.x !== undefined && dto.y !== undefined;
    return this.applySchemaCommand(diagramId, userId, (doc) =>
      addEntity(doc, {
        id: entityId,
        name: dto.name,
        ...(hasPosition ? { position: { x: dto.x!, y: dto.y! } } : {}),
      })
    );
  }

  async updateTable(
    diagramId: string,
    tableId: string,
    userId: string,
    dto: UpdateTableDto
  ): Promise<Diagram> {
    return this.applySchemaCommand(diagramId, userId, (doc) => {
      if (!doc.entities.some((e) => e.id === tableId)) throw new NotFoundException("Table not found");
      let updated = doc;
      if (dto.name !== undefined) updated = renameEntity(updated, tableId, dto.name);
      if (dto.color !== undefined) updated = updateEntityColor(updated, tableId, dto.color ?? null);
      if (dto.comment !== undefined) updated = updateEntityComment(updated, tableId, dto.comment ?? null);
      return updated;
    });
  }

  async removeTable(diagramId: string, tableId: string, userId: string): Promise<void> {
    await this.applySchemaCommand(diagramId, userId, (doc) => {
      if (!doc.entities.some((e) => e.id === tableId)) throw new NotFoundException("Table not found");
      return removeEntity(doc, tableId);
    });
  }

  async addColumn(
    diagramId: string,
    tableId: string,
    userId: string,
    dto: AddColumnDto
  ): Promise<Diagram> {
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
        comment: null,
        ordinal: entity.columns.length,
      };
      return domainAddColumn(doc, tableId, column);
    });
  }

  async updateColumn(
    diagramId: string,
    tableId: string,
    columnId: string,
    userId: string,
    dto: UpdateColumnDto
  ): Promise<Diagram> {
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
      return domainUpdateColumn(doc, tableId, columnId, changes);
    });
  }

  async removeColumn(
    diagramId: string,
    tableId: string,
    columnId: string,
    userId: string
  ): Promise<void> {
    await this.applySchemaCommand(diagramId, userId, (doc) => {
      const entity = doc.entities.find((e) => e.id === tableId);
      if (!entity) throw new NotFoundException("Table not found");
      if (!entity.columns.some((c) => c.id === columnId)) throw new NotFoundException("Column not found");
      return domainRemoveColumn(doc, tableId, columnId);
    });
  }
}
