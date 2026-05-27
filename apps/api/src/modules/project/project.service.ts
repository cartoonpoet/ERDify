import { randomUUID } from "crypto";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Project } from "@erdify/db";
import type { Repository } from "typeorm";
import { AuthorizationService } from "../../common/services/authorization.service";
import type { CreateProjectDto } from "./dto/create-project.dto";
import type { UpdateProjectDto } from "./dto/update-project.dto";
import { UsageService } from "../usage/usage.service";

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly authorizationService: AuthorizationService,
    private readonly usageService: UsageService,
  ) {}

  async create(orgId: string, userId: string, dto: CreateProjectDto): Promise<Project> {
    await this.authorizationService.requireEditorOrOwner(orgId, userId);
    const project = this.projectRepo.create({
      id: randomUUID(),
      organizationId: orgId,
      name: dto.name,
      description: dto.description ?? null,
    });
    const saved = await this.projectRepo.save(project);

    this.usageService
      .log(orgId, userId, "project_created", "project", saved.id, {
        project_id: saved.id,
      })
      .catch((e) => this.logger.error(e));

    return saved;
  }

  async findAll(orgId: string, userId: string): Promise<Project[]> {
    await this.authorizationService.requireMember(orgId, userId);
    return this.projectRepo.find({ where: { organizationId: orgId } });
  }

  async findOne(orgId: string, projectId: string, userId: string): Promise<Project> {
    await this.authorizationService.requireMember(orgId, userId);
    const project = await this.projectRepo.findOne({
      where: { id: projectId, organizationId: orgId },
    });
    if (!project) throw new NotFoundException("Project not found");
    return project;
  }

  async update(orgId: string, projectId: string, userId: string, dto: UpdateProjectDto): Promise<Project> {
    await this.authorizationService.requireEditorOrOwner(orgId, userId);
    const project = await this.projectRepo.findOne({ where: { id: projectId, organizationId: orgId } });
    if (!project) throw new NotFoundException("Project not found");
    Object.assign(project, dto);
    return this.projectRepo.save(project);
  }

  async remove(orgId: string, projectId: string, userId: string): Promise<void> {
    await this.authorizationService.requireEditorOrOwner(orgId, userId);
    const project = await this.projectRepo.findOne({ where: { id: projectId, organizationId: orgId } });
    if (!project) throw new NotFoundException("Project not found");
    await this.projectRepo.remove(project);

    this.usageService
      .log(orgId, userId, "project_deleted", "project", projectId, {
        project_id: projectId,
      })
      .catch((e) => this.logger.error(e));
  }
}
