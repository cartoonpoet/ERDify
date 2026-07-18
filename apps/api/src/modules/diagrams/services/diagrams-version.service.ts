import { randomUUID } from "node:crypto";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Diagram, DiagramVersion, Project, User } from "@erdify/db";
import type { Repository } from "typeorm";
import { AuthorizationService } from "../../../common/services/authorization.service";

export interface DiagramVersionWithName {
  id: string;
  diagramId: string;
  content: object;
  revision: number;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
}

@Injectable()
export class DiagramsVersionService {
  constructor(
    @InjectRepository(Diagram)
    private readonly diagramRepo: Repository<Diagram>,
    @InjectRepository(DiagramVersion)
    private readonly versionRepo: Repository<DiagramVersion>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly authorizationService: AuthorizationService
  ) {}

  private async getDiagramWithOrg(diagramId: string): Promise<{ diagram: Diagram; orgId: string }> {
    const diagram = await this.diagramRepo.findOne({ where: { id: diagramId } });
    if (!diagram) throw new NotFoundException("Diagram not found");
    const project = await this.projectRepo.findOne({ where: { id: diagram.projectId } });
    if (!project) throw new NotFoundException("Project not found");
    return { diagram, orgId: project.organizationId };
  }

  async saveVersion(diagramId: string, userId: string): Promise<DiagramVersion> {
    const { diagram, orgId } = await this.getDiagramWithOrg(diagramId);
    await this.authorizationService.requireEditorOrOwner(orgId, userId);
    const last = await this.versionRepo.findOne({ where: { diagramId }, order: { revision: "DESC" } });
    const revision = (last?.revision ?? 0) + 1;
    return this.versionRepo.save(
      this.versionRepo.create({ id: randomUUID(), diagramId, content: diagram.content, revision, createdBy: userId })
    );
  }

  async findVersions(diagramId: string, userId: string): Promise<DiagramVersionWithName[]> {
    const { orgId } = await this.getDiagramWithOrg(diagramId);
    await this.authorizationService.requireMember(orgId, userId);

    const versions = await this.versionRepo.find({
      where: { diagramId },
      order: { revision: "DESC" },
    });

    // Collect unique human userIds (exclude "mcp")
    const humanIds = [...new Set(versions.map((v) => v.createdBy).filter((id) => id !== "mcp"))];
    const users = humanIds.length > 0
      ? await this.userRepo.find({ where: humanIds.map((id) => ({ id })) })
      : [];
    const nameMap = new Map(users.map((u) => [u.id, u.name]));

    return versions.map((v) => ({
      id: v.id,
      diagramId: v.diagramId,
      content: v.content,
      revision: v.revision,
      createdBy: v.createdBy,
      createdByName: v.createdBy === "mcp" ? "AI" : (nameMap.get(v.createdBy) ?? "Unknown"),
      createdAt: v.createdAt,
    }));
  }

  async restoreVersion(diagramId: string, versionId: string, userId: string): Promise<Diagram> {
    const { diagram, orgId } = await this.getDiagramWithOrg(diagramId);
    await this.authorizationService.requireEditorOrOwner(orgId, userId);
    const version = await this.versionRepo.findOne({ where: { id: versionId, diagramId } });
    if (!version) throw new NotFoundException("Version not found");
    diagram.content = version.content;
    return this.diagramRepo.save(diagram);
  }
}
