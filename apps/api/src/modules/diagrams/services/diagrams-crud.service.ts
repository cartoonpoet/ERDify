import { randomUUID } from "node:crypto";
import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import { Diagram, Organization, Project } from "@erdify/db";
import type { MemberRole } from "@erdify/db";
import type { Repository } from "typeorm";
import { AuthorizationService } from "../../../common/services/authorization.service";
import type { DiagramDocument } from "@erdify/domain";
import type { CreateDiagramDto } from "../dto/create-diagram.dto";
import type { UpdateDiagramDto } from "../dto/update-diagram.dto";
import type { DuplicateDiagramDto } from "../dto/duplicate-diagram.dto";
import type { MoveDiagramDto } from "../dto/move-diagram.dto";

@Injectable()
export class DiagramsCrudService {
  constructor(
    @InjectRepository(Diagram)
    private readonly diagramRepo: Repository<Diagram>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    private readonly authorizationService: AuthorizationService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async getDiagramWithOrg(diagramId: string): Promise<{ diagram: Diagram; orgId: string; projectName: string; orgName: string }> {
    const diagram = await this.diagramRepo.findOne({ where: { id: diagramId } });
    if (!diagram) throw new NotFoundException("Diagram not found");
    const project = await this.projectRepo.findOne({ where: { id: diagram.projectId } });
    if (!project) throw new NotFoundException("Project not found");
    const org = await this.orgRepo.findOne({ where: { id: project.organizationId } });
    if (!org) throw new NotFoundException("Organization not found");
    return { diagram, orgId: project.organizationId, projectName: project.name, orgName: org.name };
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

  async findAll(projectId: string, userId: string) {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException("Project not found");
    await this.authorizationService.requireMember(project.organizationId, userId);
    const rows: Array<Record<string, unknown>> = await this.diagramRepo.query(
      `SELECT
        id,
        project_id AS "projectId",
        name,
        created_by AS "createdBy",
        share_token AS "shareToken",
        share_expires_at AS "shareExpiresAt",
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        content->>'dialect' AS dialect,
        (
          SELECT COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'id', e->>'id',
                'name', e->>'name',
                'columns', (
                  SELECT COALESCE(
                    jsonb_agg(jsonb_build_object('id', c->>'id', 'name', c->>'name')),
                    '[]'::jsonb
                  )
                  FROM (SELECT c FROM jsonb_array_elements(e->'columns') c LIMIT 3) cols
                )
              )
            ),
            '[]'::jsonb
          )
          FROM (SELECT e FROM jsonb_array_elements(content->'entities') e LIMIT 2) entities
        ) AS "previewEntities"
      FROM diagrams
      WHERE project_id = $1`,
      [projectId]
    );
    // pg driver may return JSONB subquery columns as strings — parse defensively
    return rows.map((row) => ({
      ...row,
      previewEntities: this.parsePreviewEntities(row.previewEntities),
    }));
  }

  private parsePreviewEntities(previewEntities: unknown): unknown[] {
    if (Array.isArray(previewEntities)) return previewEntities;
    if (typeof previewEntities === "string") return JSON.parse(previewEntities);
    return [];
  }

  async findOne(
    diagramId: string,
    userId: string
  ): Promise<Diagram & { organizationId: string; organizationName: string; projectName: string; myRole: string }> {
    const { diagram, orgId, orgName, projectName } = await this.getDiagramWithOrg(diagramId);
    const member = await this.authorizationService.requireMember(orgId, userId);
    return { ...diagram, organizationId: orgId, organizationName: orgName, projectName, myRole: member.role };
  }

  async update(diagramId: string, userId: string, dto: UpdateDiagramDto): Promise<Diagram> {
    const { diagram, orgId } = await this.getDiagramWithOrg(diagramId);
    await this.authorizationService.requireEditorOrOwner(orgId, userId);
    if (dto.name !== undefined) diagram.name = dto.name;
    if (dto.content !== undefined) diagram.content = dto.content;
    if (dto.dialect !== undefined) {
      diagram.content = { ...(diagram.content as object), dialect: dto.dialect };
    }
    const saved = await this.diagramRepo.save(diagram);
    if (dto.content !== undefined || dto.dialect !== undefined) {
      // 활성 협업 룸이 stale 문서로 DB를 되덮지 않게 룸 동기화를 트리거한다(#111)
      this.eventEmitter.emit("diagram.content.updated", { diagramId, content: saved.content });
    }
    return saved;
  }

  async remove(diagramId: string, userId: string): Promise<void> {
    const { diagram, orgId } = await this.getDiagramWithOrg(diagramId);
    await this.authorizationService.requireEditorOrOwner(orgId, userId);
    await this.diagramRepo.remove(diagram);
  }

  async duplicate(
    diagramId: string,
    userId: string,
    dto?: DuplicateDiagramDto
  ): Promise<Diagram & { organizationId: string; organizationName: string; projectName: string; myRole: string }> {
    const { diagram, orgId, orgName, projectName } = await this.getDiagramWithOrg(diagramId);
    const member = await this.authorizationService.requireEditorOrOwner(orgId, userId);
    const src = diagram.content as DiagramDocument;

    // 엔티티 ID 재매핑
    const entityIdMap = new Map<string, string>();
    src.entities.forEach((e) => entityIdMap.set(e.id, randomUUID()));

    // 컬럼 ID 재매핑
    const columnIdMap = new Map<string, string>();
    src.entities.forEach((e) => e.columns.forEach((c) => columnIdMap.set(c.id, randomUUID())));

    const now = new Date().toISOString();
    const newId = randomUUID();
    const newName = dto?.name ?? `${src.name} (복사본)`;
    const newDialect = dto?.dialect ?? src.dialect;

    const newContent: DiagramDocument = {
      ...src,
      id: newId,
      name: newName,
      dialect: newDialect as DiagramDocument["dialect"],
      metadata: { ...src.metadata, revision: 1, createdAt: now, updatedAt: now },
      entities: src.entities.map((e) => ({
        ...e,
        id: entityIdMap.get(e.id)!,
        columns: e.columns.map((c) => ({ ...c, id: columnIdMap.get(c.id)! })),
      })),
      relationships: src.relationships.map((r) => ({
        ...r,
        id: randomUUID(),
        sourceEntityId: entityIdMap.get(r.sourceEntityId) ?? r.sourceEntityId,
        targetEntityId: entityIdMap.get(r.targetEntityId) ?? r.targetEntityId,
        sourceColumnIds: r.sourceColumnIds.map((id) => columnIdMap.get(id) ?? id),
        targetColumnIds: r.targetColumnIds.map((id) => columnIdMap.get(id) ?? id),
      })),
      indexes: src.indexes.map((i) => ({
        ...i,
        id: randomUUID(),
        entityId: entityIdMap.get(i.entityId) ?? i.entityId,
        columnIds: i.columnIds.map((id) => columnIdMap.get(id) ?? id),
      })),
      layout: {
        entityPositions: Object.fromEntries(
          Object.entries(src.layout.entityPositions).map(([oldId, pos]) => [
            entityIdMap.get(oldId) ?? oldId,
            pos,
          ])
        ),
      },
    };

    let targetProjectId = diagram.projectId;
    let targetProjectName = projectName;
    if (dto?.targetProjectId) {
      const targetProject = await this.projectRepo.findOne({ where: { id: dto.targetProjectId } });
      if (!targetProject) throw new NotFoundException("Project not found");
      if (targetProject.organizationId !== orgId) throw new ForbiddenException();
      await this.authorizationService.requireEditorOrOwner(targetProject.organizationId, userId);
      targetProjectId = targetProject.id;
      targetProjectName = targetProject.name;
    }

    const saved = await this.diagramRepo.save(
      this.diagramRepo.create({ id: newId, projectId: targetProjectId, name: newName, content: newContent, createdBy: userId })
    );
    return { ...saved, organizationId: orgId, organizationName: orgName, projectName: targetProjectName, myRole: member.role };
  }

  async move(
    diagramId: string,
    userId: string,
    dto: MoveDiagramDto
  ): Promise<Diagram & { organizationId: string; organizationName: string; projectName: string; myRole: string }> {
    const { diagram, orgId, orgName } = await this.getDiagramWithOrg(diagramId);
    await this.authorizationService.requireEditorOrOwner(orgId, userId);

    const targetProject = await this.projectRepo.findOne({ where: { id: dto.targetProjectId } });
    if (!targetProject) throw new NotFoundException("Project not found");
    if (targetProject.organizationId !== orgId) throw new ForbiddenException();
    const member = await this.authorizationService.requireEditorOrOwner(targetProject.organizationId, userId);

    diagram.projectId = targetProject.id;
    const saved = await this.diagramRepo.save(diagram);
    return { ...saved, organizationId: orgId, organizationName: orgName, projectName: targetProject.name, myRole: member.role };
  }

  /**
   * 협업 소켓이 편집마다 부르는 경로라 가볍게 유지한다 — content(jsonb)는 테이블 1000개면
   * 1.6MB라서 읽지 않고 권한 판단에 필요한 projectId·organizationId만 조회한다.
   * 멤버가 아니거나 다이어그램이 없으면 null.
   */
  async getDiagramRole(diagramId: string, userId: string): Promise<MemberRole | null> {
    const diagram = await this.diagramRepo.findOne({
      where: { id: diagramId },
      select: { id: true, projectId: true },
    });
    if (!diagram) return null;
    const project = await this.projectRepo.findOne({
      where: { id: diagram.projectId },
      select: { id: true, organizationId: true },
    });
    if (!project) return null;
    try {
      const member = await this.authorizationService.requireMember(project.organizationId, userId);
      return member.role;
    } catch {
      return null;
    }
  }

  async canAccessDiagram(diagramId: string, userId: string): Promise<boolean> {
    return (await this.getDiagramRole(diagramId, userId)) !== null;
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
