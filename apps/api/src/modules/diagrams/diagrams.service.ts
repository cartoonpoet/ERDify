import { randomUUID } from "crypto";
import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Diagram, DiagramVersion, OrganizationMember, Project } from "@erdify/db";
import type { Repository } from "typeorm";
import type { CreateDiagramDto } from "./dto/create-diagram.dto";
import type { UpdateDiagramDto } from "./dto/update-diagram.dto";

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

  async create(projectId: string, userId: string, dto: CreateDiagramDto): Promise<Diagram> {
    const project = await this.getProject(projectId);
    await this.requireEditorOrOwner(project.organizationId, userId);
    const now = new Date().toISOString();
    const id = randomUUID();
    const content = {
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
    return this.diagramRepo.save(this.diagramRepo.create({ id, projectId, name: dto.name, content }));
  }

  async findAll(projectId: string, userId: string): Promise<Diagram[]> {
    const project = await this.getProject(projectId);
    await this.requireMember(project.organizationId, userId);
    return this.diagramRepo.find({ where: { projectId } });
  }

  async findOne(diagramId: string, userId: string): Promise<Diagram> {
    const { diagram, orgId } = await this.getDiagramWithOrg(diagramId);
    await this.requireMember(orgId, userId);
    return diagram;
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
}
