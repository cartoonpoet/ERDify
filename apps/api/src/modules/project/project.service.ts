import { randomUUID } from "crypto";
import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { OrganizationMember, Project } from "@erdify/db";
import { Repository } from "typeorm";
import { CreateProjectDto } from "./dto/create-project.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(OrganizationMember)
    private readonly memberRepo: Repository<OrganizationMember>
  ) {}

  private async requireMember(orgId: string, userId: string) {
    const membership = await this.memberRepo.findOne({ where: { organizationId: orgId, userId } });
    if (!membership) throw new ForbiddenException();
    return membership;
  }

  private async requireEditorOrOwner(orgId: string, userId: string) {
    const membership = await this.requireMember(orgId, userId);
    if (membership.role === "viewer") throw new ForbiddenException();
    return membership;
  }

  async create(orgId: string, userId: string, dto: CreateProjectDto): Promise<Project> {
    await this.requireEditorOrOwner(orgId, userId);
    const project = this.projectRepo.create({
      id: randomUUID(),
      organizationId: orgId,
      name: dto.name,
      description: dto.description ?? null
    });
    return this.projectRepo.save(project);
  }

  async findAll(orgId: string, userId: string): Promise<Project[]> {
    await this.requireMember(orgId, userId);
    return this.projectRepo.find({ where: { organizationId: orgId } });
  }

  async findOne(orgId: string, projectId: string, userId: string): Promise<Project> {
    await this.requireMember(orgId, userId);
    const project = await this.projectRepo.findOne({
      where: { id: projectId, organizationId: orgId }
    });
    if (!project) throw new NotFoundException("Project not found");
    return project;
  }

  async update(
    orgId: string,
    projectId: string,
    userId: string,
    dto: UpdateProjectDto
  ): Promise<Project> {
    await this.requireEditorOrOwner(orgId, userId);
    const project = await this.projectRepo.findOne({
      where: { id: projectId, organizationId: orgId }
    });
    if (!project) throw new NotFoundException("Project not found");
    Object.assign(project, dto);
    return this.projectRepo.save(project);
  }

  async remove(orgId: string, projectId: string, userId: string): Promise<void> {
    await this.requireEditorOrOwner(orgId, userId);
    const project = await this.projectRepo.findOne({
      where: { id: projectId, organizationId: orgId }
    });
    if (!project) throw new NotFoundException("Project not found");
    await this.projectRepo.remove(project);
  }
}
