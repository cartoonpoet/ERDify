import { randomUUID } from "crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Diagram, Project } from "@erdify/db";
import type { Repository } from "typeorm";
import { AuthorizationService } from "../../../common/services/authorization.service";
import type { DiagramDocument } from "@erdify/domain";
import type { CreateDiagramDto } from "../dto/create-diagram.dto";
import type { UpdateDiagramDto } from "../dto/update-diagram.dto";

@Injectable()
export class DiagramsCrudService {
  constructor(
    @InjectRepository(Diagram)
    private readonly diagramRepo: Repository<Diagram>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly authorizationService: AuthorizationService
  ) {}

  async getDiagramWithOrg(diagramId: string): Promise<{ diagram: Diagram; orgId: string }> {
    const diagram = await this.diagramRepo.findOne({ where: { id: diagramId } });
    if (!diagram) throw new NotFoundException("Diagram not found");
    const project = await this.projectRepo.findOne({ where: { id: diagram.projectId } });
    if (!project) throw new NotFoundException("Project not found");
    return { diagram, orgId: project.organizationId };
  }

  async create(projectId: string, userId: string, dto: CreateDiagramDto): Promise<Diagram> {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException("Project not found");
    await this.authorizationService.requireEditorOrOwner(project.organizationId, userId);
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
          metadata: { revision: 1, stableObjectIds: true, createdAt: now, updatedAt: now },
        };
    return this.diagramRepo.save(
      this.diagramRepo.create({ id, projectId, name: dto.name, content, createdBy: userId })
    );
  }

  async findAll(projectId: string, userId: string): Promise<Diagram[]> {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException("Project not found");
    await this.authorizationService.requireMember(project.organizationId, userId);
    return this.diagramRepo.find({ where: { projectId } });
  }

  async findOne(
    diagramId: string,
    userId: string
  ): Promise<Diagram & { organizationId: string; myRole: string }> {
    const { diagram, orgId } = await this.getDiagramWithOrg(diagramId);
    const member = await this.authorizationService.requireMember(orgId, userId);
    return { ...diagram, organizationId: orgId, myRole: member.role };
  }

  async update(diagramId: string, userId: string, dto: UpdateDiagramDto): Promise<Diagram> {
    const { diagram, orgId } = await this.getDiagramWithOrg(diagramId);
    await this.authorizationService.requireEditorOrOwner(orgId, userId);
    Object.assign(diagram, dto);
    return this.diagramRepo.save(diagram);
  }

  async remove(diagramId: string, userId: string): Promise<void> {
    const { diagram, orgId } = await this.getDiagramWithOrg(diagramId);
    await this.authorizationService.requireEditorOrOwner(orgId, userId);
    await this.diagramRepo.remove(diagram);
  }

  async canAccessDiagram(diagramId: string, userId: string): Promise<boolean> {
    try {
      const { orgId } = await this.getDiagramWithOrg(diagramId);
      await this.authorizationService.requireMember(orgId, userId);
      return true;
    } catch {
      return false;
    }
  }

  async assertReadAccess(diagramId: string, userId: string): Promise<void> {
    const { orgId } = await this.getDiagramWithOrg(diagramId);
    await this.authorizationService.requireMember(orgId, userId);
  }

  async assertEditorAccess(diagramId: string, userId: string): Promise<void> {
    const { orgId } = await this.getDiagramWithOrg(diagramId);
    await this.authorizationService.requireEditorOrOwner(orgId, userId);
  }
}
