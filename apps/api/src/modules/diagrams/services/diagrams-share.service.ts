import { randomUUID } from "crypto";
import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Diagram, Project } from "@erdify/db";
import type { Repository } from "typeorm";
import { AuthorizationService } from "../../../common/services/authorization.service";
import type { SharePreset } from "../dto/share-diagram.dto";

@Injectable()
export class DiagramsShareService {
  private static presetToMs: Record<SharePreset, number> = {
    "1h": 3_600_000,
    "1d": 86_400_000,
    "7d": 604_800_000,
    "30d": 2_592_000_000,
  };

  constructor(
    @InjectRepository(Diagram)
    private readonly diagramRepo: Repository<Diagram>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly authorizationService: AuthorizationService
  ) {}

  private async getDiagramWithOrg(diagramId: string): Promise<{ diagram: Diagram; orgId: string }> {
    const diagram = await this.diagramRepo.findOne({ where: { id: diagramId } });
    if (!diagram) throw new NotFoundException("Diagram not found");
    const project = await this.projectRepo.findOne({ where: { id: diagram.projectId } });
    if (!project) throw new NotFoundException("Project not found");
    return { diagram, orgId: project.organizationId };
  }

  async generateShareLink(
    diagramId: string,
    userId: string,
    preset: SharePreset
  ): Promise<{ shareToken: string; expiresAt: Date }> {
    const { diagram, orgId } = await this.getDiagramWithOrg(diagramId);
    await this.authorizationService.requireEditorOrOwner(orgId, userId);
    const shareToken = randomUUID();
    const expiresAt = new Date(Date.now() + DiagramsShareService.presetToMs[preset]);
    diagram.shareToken = shareToken;
    diagram.shareExpiresAt = expiresAt;
    await this.diagramRepo.save(diagram);
    return { shareToken, expiresAt };
  }

  async revokeShareLink(diagramId: string, userId: string): Promise<void> {
    const { diagram, orgId } = await this.getDiagramWithOrg(diagramId);
    await this.authorizationService.requireEditorOrOwner(orgId, userId);
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
}
