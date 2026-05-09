# Backend Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ERDify API 백엔드의 중복 코드, N+1 쿼리, 에러 처리 불일관성, 느슨한 타입/설정을 전면 리팩토링한다.

**Architecture:** 카테고리별 순서(A→B→C→D)로 진행. AuthorizationService·DomainLoaderService를 CommonModule로 추출하고, DiagramsService를 4개 sub-service + facade로 분할한 뒤, 쿼리 최적화 → 에러 처리 → 타입/설정 순으로 개선한다.

**Tech Stack:** NestJS, TypeORM 0.3, Vitest, @erdify/domain (ESM-only), @erdify/db

---

## File Map

### 신규 생성
| 경로 | 역할 |
|------|------|
| `apps/api/src/common/services/authorization.service.ts` | 멤버/권한 검증 공통 서비스 |
| `apps/api/src/common/services/domain-loader.service.ts` | @erdify/domain ESM 동적 import 캡슐화 |
| `apps/api/src/common/common.module.ts` | 위 두 서비스 등록·export |
| `apps/api/src/common/config/app.config.ts` | 환경변수 기반 앱 설정 |
| `apps/api/src/modules/diagrams/services/diagrams-crud.service.ts` | Diagram CRUD + 접근 검증 |
| `apps/api/src/modules/diagrams/services/diagrams-schema.service.ts` | 테이블·컬럼·관계 조작 |
| `apps/api/src/modules/diagrams/services/diagrams-version.service.ts` | 버전 관리 |
| `apps/api/src/modules/diagrams/services/diagrams-share.service.ts` | 공유 링크 관리 |

### 수정
| 경로 | 변경 내용 |
|------|-----------|
| `apps/api/src/modules/diagrams/diagrams.service.ts` | sub-service를 위임하는 파사드로 교체 |
| `apps/api/src/modules/diagrams/diagrams.module.ts` | CommonModule import, sub-service 등록 |
| `apps/api/src/modules/project/project.service.ts` | AuthorizationService 주입, 중복 메서드 제거 |
| `apps/api/src/modules/project/project.module.ts` | CommonModule import |
| `apps/api/src/modules/organization/organization.service.ts` | N+1 쿼리 → Promise.all, select 명시 |
| `apps/api/src/modules/auth/auth.service.ts` | 루프 내 쿼리 → 배치 |
| `apps/api/src/modules/collaboration/collaboration.service.ts` | ConfigService로 타이머 설정 |
| `apps/api/src/modules/collaboration/collaboration.gateway.ts` | catch 블록 에러 로깅 |
| `apps/api/src/modules/email/email.service.ts` | 반환 타입 boolean, 로그 레벨 error |
| `apps/api/src/modules/diagrams/mcp-sessions.controller.ts` | { ok: true } → NO_CONTENT |
| `apps/api/src/modules/diagrams/dto/add-column.dto.ts` | 기본값 DTO 레벨로 이동 |
| `apps/api/src/app.module.ts` | app.config 등록 |

---

## Task 1: `AuthorizationService` + `CommonModule` 생성

**Files:**
- Create: `apps/api/src/common/services/authorization.service.ts`
- Create: `apps/api/src/common/common.module.ts`

- [ ] **Step 1: 테스트 작성**

`apps/api/src/common/services/authorization.service.spec.ts` 생성:

```typescript
import { ForbiddenException } from "@nestjs/common";
import type { OrganizationMember } from "@erdify/db";
import type { Repository } from "typeorm";
import { AuthorizationService } from "./authorization.service";

type MockRepo = { findOne: ReturnType<typeof vi.fn> };

describe("AuthorizationService", () => {
  let service: AuthorizationService;
  let memberRepo: MockRepo;

  beforeEach(() => {
    memberRepo = { findOne: vi.fn() };
    service = new AuthorizationService(memberRepo as unknown as Repository<OrganizationMember>);
  });

  describe("requireMember", () => {
    it("throws ForbiddenException when not a member", async () => {
      memberRepo.findOne.mockResolvedValue(null);
      await expect(service.requireMember("org-1", "user-1")).rejects.toThrow(ForbiddenException);
    });

    it("returns membership when member exists", async () => {
      const member = { organizationId: "org-1", userId: "user-1", role: "editor" };
      memberRepo.findOne.mockResolvedValue(member);
      await expect(service.requireMember("org-1", "user-1")).resolves.toEqual(member);
    });
  });

  describe("requireEditorOrOwner", () => {
    it("throws ForbiddenException for viewer role", async () => {
      memberRepo.findOne.mockResolvedValue({ role: "viewer" });
      await expect(service.requireEditorOrOwner("org-1", "user-1")).rejects.toThrow(ForbiddenException);
    });

    it("resolves for editor role", async () => {
      memberRepo.findOne.mockResolvedValue({ role: "editor" });
      await expect(service.requireEditorOrOwner("org-1", "user-1")).resolves.toBeDefined();
    });

    it("resolves for owner role", async () => {
      memberRepo.findOne.mockResolvedValue({ role: "owner" });
      await expect(service.requireEditorOrOwner("org-1", "user-1")).resolves.toBeDefined();
    });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd apps/api && pnpm test
```

Expected: FAIL — `authorization.service` 모듈 없음

- [ ] **Step 3: `AuthorizationService` 구현**

`apps/api/src/common/services/authorization.service.ts`:

```typescript
import { ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { OrganizationMember } from "@erdify/db";
import type { Repository } from "typeorm";

@Injectable()
export class AuthorizationService {
  constructor(
    @InjectRepository(OrganizationMember)
    private readonly memberRepo: Repository<OrganizationMember>
  ) {}

  async requireMember(orgId: string, userId: string): Promise<OrganizationMember> {
    const m = await this.memberRepo.findOne({ where: { organizationId: orgId, userId } });
    if (!m) throw new ForbiddenException();
    return m;
  }

  async requireEditorOrOwner(orgId: string, userId: string): Promise<OrganizationMember> {
    const m = await this.requireMember(orgId, userId);
    if (m.role === "viewer") throw new ForbiddenException();
    return m;
  }
}
```

- [ ] **Step 4: `CommonModule` 생성**

`apps/api/src/common/common.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrganizationMember } from "@erdify/db";
import { AuthorizationService } from "./services/authorization.service";

@Module({
  imports: [TypeOrmModule.forFeature([OrganizationMember])],
  providers: [AuthorizationService],
  exports: [AuthorizationService],
})
export class CommonModule {}
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
cd apps/api && pnpm test
```

Expected: PASS — authorization.service.spec.ts 3/3 tests pass

- [ ] **Step 6: 커밋**

```bash
git add apps/api/src/common/
git commit -m "feat(api): add AuthorizationService and CommonModule"
```

---

## Task 2: `DomainLoaderService` 생성

**Files:**
- Create: `apps/api/src/common/services/domain-loader.service.ts`
- Modify: `apps/api/src/common/common.module.ts`

> **배경:** `@erdify/domain`은 ESM-only 패키지이고 API는 CommonJS 빌드다. TypeScript가 `import()` → `require()`로 변환하는 것을 막기 위해 `new Function()` 패턴이 필요하다. 기존에는 모듈 레벨 mutable 전역 변수와 `_setDomainModuleForTest()`를 사용해 테스트에서 주입했는데, 이를 NestJS DI 패턴으로 교체해 `vi.mock()`으로 표준 모킹이 가능하게 만든다.

- [ ] **Step 1: `DomainLoaderService` 구현**

`apps/api/src/common/services/domain-loader.service.ts`:

```typescript
import { Injectable } from "@nestjs/common";

type DomainModule = typeof import("@erdify/domain");

@Injectable()
export class DomainLoaderService {
  private modulePromise?: Promise<DomainModule>;

  load(): Promise<DomainModule> {
    this.modulePromise ??= (
      new Function("s", "return import(s)") as (s: string) => Promise<DomainModule>
    )("@erdify/domain");
    return this.modulePromise;
  }
}
```

- [ ] **Step 2: `CommonModule`에 등록**

`apps/api/src/common/common.module.ts` 수정:

```typescript
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrganizationMember } from "@erdify/db";
import { AuthorizationService } from "./services/authorization.service";
import { DomainLoaderService } from "./services/domain-loader.service";

@Module({
  imports: [TypeOrmModule.forFeature([OrganizationMember])],
  providers: [AuthorizationService, DomainLoaderService],
  exports: [AuthorizationService, DomainLoaderService],
})
export class CommonModule {}
```

- [ ] **Step 3: 테스트 통과 확인**

```bash
cd apps/api && pnpm test
```

Expected: PASS — 기존 테스트 모두 통과

- [ ] **Step 4: 커밋**

```bash
git add apps/api/src/common/
git commit -m "feat(api): add DomainLoaderService to CommonModule"
```

---

## Task 3: `ProjectService` — `AuthorizationService` 주입

**Files:**
- Modify: `apps/api/src/modules/project/project.service.ts`
- Modify: `apps/api/src/modules/project/project.module.ts`

- [ ] **Step 1: `ProjectModule`에 `CommonModule` import**

`apps/api/src/modules/project/project.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Project } from "@erdify/db";
import { AuthModule } from "../auth/auth.module";
import { CommonModule } from "../../common/common.module";
import { ProjectController } from "./project.controller";
import { ProjectService } from "./project.service";

@Module({
  imports: [TypeOrmModule.forFeature([Project]), AuthModule, CommonModule],
  controllers: [ProjectController],
  providers: [ProjectService],
})
export class ProjectModule {}
```

> `OrganizationMember` repo는 `CommonModule`이 소유하므로 `project.module.ts`에서 제거한다.

- [ ] **Step 2: `ProjectService` 수정 — 중복 메서드 제거, `AuthorizationService` 주입**

`apps/api/src/modules/project/project.service.ts`:

```typescript
import { randomUUID } from "crypto";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Project } from "@erdify/db";
import type { Repository } from "typeorm";
import { AuthorizationService } from "../../common/services/authorization.service";
import type { CreateProjectDto } from "./dto/create-project.dto";
import type { UpdateProjectDto } from "./dto/update-project.dto";

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly authorizationService: AuthorizationService
  ) {}

  async create(orgId: string, userId: string, dto: CreateProjectDto): Promise<Project> {
    await this.authorizationService.requireEditorOrOwner(orgId, userId);
    const project = this.projectRepo.create({
      id: randomUUID(),
      organizationId: orgId,
      name: dto.name,
      description: dto.description ?? null,
    });
    return this.projectRepo.save(project);
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
  }
}
```

- [ ] **Step 3: 테스트 통과 확인**

```bash
cd apps/api && pnpm test
```

Expected: PASS

- [ ] **Step 4: 커밋**

```bash
git add apps/api/src/modules/project/
git commit -m "refactor(project): use AuthorizationService, remove duplicate requireMember"
```

---

## Task 4: `DiagramsService` 분할 — sub-services + facade

**Files:**
- Create: `apps/api/src/modules/diagrams/services/diagrams-crud.service.ts`
- Create: `apps/api/src/modules/diagrams/services/diagrams-schema.service.ts`
- Create: `apps/api/src/modules/diagrams/services/diagrams-version.service.ts`
- Create: `apps/api/src/modules/diagrams/services/diagrams-share.service.ts`
- Modify: `apps/api/src/modules/diagrams/diagrams.service.ts`
- Modify: `apps/api/src/modules/diagrams/diagrams.module.ts`

- [ ] **Step 1: `DiagramsCrudService` 생성**

`apps/api/src/modules/diagrams/services/diagrams-crud.service.ts`:

```typescript
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
```

- [ ] **Step 2: `DiagramsSchemaService` 생성**

`apps/api/src/modules/diagrams/services/diagrams-schema.service.ts`:

```typescript
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
        comment: null,
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
```

- [ ] **Step 3: `DiagramsVersionService` 생성**

`apps/api/src/modules/diagrams/services/diagrams-version.service.ts`:

```typescript
import { randomUUID } from "crypto";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Diagram, DiagramVersion, Project } from "@erdify/db";
import type { Repository } from "typeorm";
import { AuthorizationService } from "../../../common/services/authorization.service";

@Injectable()
export class DiagramsVersionService {
  constructor(
    @InjectRepository(Diagram)
    private readonly diagramRepo: Repository<Diagram>,
    @InjectRepository(DiagramVersion)
    private readonly versionRepo: Repository<DiagramVersion>,
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

  async saveVersion(diagramId: string, userId: string): Promise<DiagramVersion> {
    const { diagram, orgId } = await this.getDiagramWithOrg(diagramId);
    await this.authorizationService.requireEditorOrOwner(orgId, userId);
    const last = await this.versionRepo.findOne({ where: { diagramId }, order: { revision: "DESC" } });
    const revision = (last?.revision ?? 0) + 1;
    return this.versionRepo.save(
      this.versionRepo.create({ id: randomUUID(), diagramId, content: diagram.content, revision, createdBy: userId })
    );
  }

  async findVersions(diagramId: string, userId: string): Promise<DiagramVersion[]> {
    const { orgId } = await this.getDiagramWithOrg(diagramId);
    await this.authorizationService.requireMember(orgId, userId);
    return this.versionRepo.find({ where: { diagramId }, order: { revision: "DESC" } });
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
```

- [ ] **Step 4: `DiagramsShareService` 생성**

`apps/api/src/modules/diagrams/services/diagrams-share.service.ts`:

```typescript
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
```

- [ ] **Step 5: `DiagramsService` facade로 교체**

`apps/api/src/modules/diagrams/diagrams.service.ts` 전체 교체:

```typescript
import { Injectable } from "@nestjs/common";
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
import { DiagramsCrudService } from "./services/diagrams-crud.service";
import { DiagramsSchemaService } from "./services/diagrams-schema.service";
import { DiagramsVersionService } from "./services/diagrams-version.service";
import { DiagramsShareService } from "./services/diagrams-share.service";

@Injectable()
export class DiagramsService {
  constructor(
    private readonly crud: DiagramsCrudService,
    private readonly schema: DiagramsSchemaService,
    private readonly version: DiagramsVersionService,
    private readonly share: DiagramsShareService
  ) {}

  create(projectId: string, userId: string, dto: CreateDiagramDto): Promise<Diagram> {
    return this.crud.create(projectId, userId, dto);
  }

  findAll(projectId: string, userId: string): Promise<Diagram[]> {
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

  findVersions(diagramId: string, userId: string): Promise<DiagramVersion[]> {
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
}
```

- [ ] **Step 6: `DiagramsModule` 업데이트**

`apps/api/src/modules/diagrams/diagrams.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Diagram, DiagramVersion, McpSession, Project } from "@erdify/db";
import { AuthModule } from "../auth/auth.module";
import { CommonModule } from "../../common/common.module";
import { PublicDiagramsController } from "./public-diagrams.controller";
import { DiagramsController } from "./diagrams.controller";
import { DiagramsService } from "./diagrams.service";
import { DiagramsCrudService } from "./services/diagrams-crud.service";
import { DiagramsSchemaService } from "./services/diagrams-schema.service";
import { DiagramsVersionService } from "./services/diagrams-version.service";
import { DiagramsShareService } from "./services/diagrams-share.service";
import { McpSessionsController } from "./mcp-sessions.controller";
import { McpSessionsService } from "./mcp-sessions.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Diagram, DiagramVersion, McpSession, Project]),
    AuthModule,
    CommonModule,
  ],
  controllers: [PublicDiagramsController, DiagramsController, McpSessionsController],
  providers: [
    DiagramsCrudService,
    DiagramsSchemaService,
    DiagramsVersionService,
    DiagramsShareService,
    DiagramsService,
    McpSessionsService,
  ],
  exports: [DiagramsService],
})
export class DiagramsModule {}
```

> `OrganizationMember` repo는 `CommonModule`이 제공하므로 `forFeature` 목록에서 제거한다.

- [ ] **Step 7: `diagrams.service.spec.ts` 업데이트**

기존 spec은 `new DiagramsService(diagramRepo, versionRepo, projectRepo, memberRepo)` 패턴을 사용하므로, facade 구조에 맞게 `beforeEach` 블록과 import를 교체한다.

`apps/api/src/modules/diagrams/diagrams.service.spec.ts` 상단 import 블록을 교체:

```typescript
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { Diagram, DiagramVersion, OrganizationMember, Project } from "@erdify/db";
import type { Repository } from "typeorm";
import { DiagramsService } from "./diagrams.service";
import { DiagramsCrudService } from "./services/diagrams-crud.service";
import { DiagramsSchemaService } from "./services/diagrams-schema.service";
import { DiagramsVersionService } from "./services/diagrams-version.service";
import { DiagramsShareService } from "./services/diagrams-share.service";
import { AuthorizationService } from "../../common/services/authorization.service";
import type { DomainLoaderService } from "../../common/services/domain-loader.service";
import type { DiagramDocument } from "@erdify/domain";
import * as erdifyDomain from "@erdify/domain";
```

`beforeEach` 블록 교체:

```typescript
beforeEach(() => {
  diagramRepo = { findOne: vi.fn(), find: vi.fn(), create: vi.fn(), save: vi.fn(), remove: vi.fn() };
  versionRepo = { findOne: vi.fn(), find: vi.fn(), create: vi.fn(), save: vi.fn() };
  projectRepo = { findOne: vi.fn(), find: vi.fn(), create: vi.fn(), save: vi.fn() };
  memberRepo = { findOne: vi.fn(), find: vi.fn(), create: vi.fn(), save: vi.fn() };

  const authService = new AuthorizationService(memberRepo as unknown as Repository<OrganizationMember>);
  const domainLoader = { load: vi.fn().mockResolvedValue(erdifyDomain) } as unknown as DomainLoaderService;

  const crud = new DiagramsCrudService(
    diagramRepo as unknown as Repository<Diagram>,
    projectRepo as unknown as Repository<Project>,
    authService
  );
  const schema = new DiagramsSchemaService(
    diagramRepo as unknown as Repository<Diagram>,
    projectRepo as unknown as Repository<Project>,
    authService,
    domainLoader
  );
  const version = new DiagramsVersionService(
    diagramRepo as unknown as Repository<Diagram>,
    versionRepo as unknown as Repository<DiagramVersion>,
    projectRepo as unknown as Repository<Project>,
    authService
  );
  const share = new DiagramsShareService(
    diagramRepo as unknown as Repository<Diagram>,
    projectRepo as unknown as Repository<Project>,
    authService
  );

  service = new DiagramsService(crud, schema, version, share);
});
```

> 기존 `_setDomainModuleForTest` import 및 `_setDomainModuleForTest(erdifyDomain)` 호출 라인을 제거한다. 나머지 `describe` 블록(테스트 케이스)은 변경하지 않는다.

- [ ] **Step 8: 테스트 통과 확인**

```bash
cd apps/api && pnpm test
```

Expected: PASS — 기존 테스트 모두 통과

- [ ] **Step 9: 타입 체크**

```bash
cd apps/api && pnpm typecheck
```

Expected: 에러 없음

- [ ] **Step 10: 커밋**

```bash
git add apps/api/src/modules/diagrams/ apps/api/src/common/
git commit -m "refactor(diagrams): split DiagramsService into sub-services, use DomainLoaderService"
```

---

## Task 5: N+1 쿼리 제거 — `organization.service.ts`

**Files:**
- Modify: `apps/api/src/modules/organization/organization.service.ts`

- [ ] **Step 1: `findOne` — 순차 쿼리 → `Promise.all` 병렬 실행**

`organization.service.ts`의 `findOne` 메서드를 교체한다:

```typescript
async findOne(orgId: string, userId: string): Promise<Organization> {
  const [membership, org] = await Promise.all([
    this.memberRepo.findOne({ where: { organizationId: orgId, userId } }),
    this.orgRepo.findOne({ where: { id: orgId } }),
  ]);
  if (!org) throw new NotFoundException("Organization not found");
  if (!membership) throw new ForbiddenException();
  return org;
}
```

- [ ] **Step 2: `getMembers` — User 전체 로드 → 필요한 컬럼만 select**

`organization.service.ts`의 `getMembers` 메서드 내 `find` 옵션을 교체한다:

```typescript
const members = await this.memberRepo.find({
  select: {
    userId: true,
    role: true,
    joinedAt: true,
    user: {
      id: true,
      email: true,
      name: true,
    },
  },
  where: { organizationId: orgId },
  relations: { user: true },
  order: { joinedAt: "ASC" },
});
```

- [ ] **Step 3: 테스트 통과 확인**

```bash
cd apps/api && pnpm test
```

Expected: PASS

- [ ] **Step 4: 커밋**

```bash
git add apps/api/src/modules/organization/organization.service.ts
git commit -m "perf(organization): parallel member+org queries, select only needed user columns"
```

---

## Task 6: 배치 auto-accept — `auth.service.ts`

**Files:**
- Modify: `apps/api/src/modules/auth/auth.service.ts`

- [ ] **Step 1: `register`의 auto-accept 루프를 배치 쿼리로 교체**

`auth.service.ts`의 `register` 메서드 내 `// auto-accept pending invites` 블록을 교체한다:

```typescript
// auto-accept pending invites
const pendingInvites = await this.inviteRepo.find({
  where: { email: dto.email, acceptedAt: IsNull(), expiresAt: MoreThan(new Date()) },
});

if (pendingInvites.length > 0) {
  const orgIds = pendingInvites.map((i) => i.orgId);
  const existingMembers = await this.memberRepo.find({
    where: { organizationId: In(orgIds), userId: saved.id },
  });
  const existingOrgIds = new Set(existingMembers.map((m) => m.organizationId));

  const newMembers = pendingInvites
    .filter((i) => !existingOrgIds.has(i.orgId))
    .map((i) => this.memberRepo.create({ organizationId: i.orgId, userId: saved.id, role: i.role }));

  await this.memberRepo.save(newMembers);
  await this.inviteRepo.save(
    pendingInvites.map((i) => Object.assign(i, { acceptedAt: new Date() }))
  );
}
```

- [ ] **Step 2: `In` import 추가 확인**

`auth.service.ts` 상단 import에 `In`이 포함되어 있는지 확인한다. 기존 import 줄:

```typescript
import { IsNull, MoreThan, In, type Repository } from "typeorm";
```

- [ ] **Step 3: 테스트 통과 확인**

```bash
cd apps/api && pnpm test
```

Expected: PASS — auth.service.spec.ts 포함 전체 통과

- [ ] **Step 4: 커밋**

```bash
git add apps/api/src/modules/auth/auth.service.ts
git commit -m "perf(auth): replace invite auto-accept loop with batch query"
```

---

## Task 7: 에러 처리 개선

**Files:**
- Modify: `apps/api/src/modules/collaboration/collaboration.gateway.ts`
- Modify: `apps/api/src/modules/email/email.service.ts`
- Modify: `apps/api/src/modules/organization/organization.service.ts`
- Modify: `apps/api/src/modules/diagrams/mcp-sessions.controller.ts`

- [ ] **Step 1: `collaboration.gateway.ts` — catch 블록에 에러 로깅 추가**

`handleConnection`의 catch 블록:
```typescript
} catch (err) {
  this.logger.error("WebSocket connection rejected", (err as Error).message);
  client.disconnect();
}
```

`handleJoin`의 catch 블록:
```typescript
} catch (err) {
  this.logger.error("Failed to join diagram", (err as Error).stack);
  client.emit("error", { message: "Failed to join diagram" });
  client.disconnect();
}
```

`Logger` 인스턴스를 `CollaborationGateway` 클래스에 추가한다:
```typescript
import { Logger } from "@nestjs/common";

export class CollaborationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(CollaborationGateway.name);
  // ...
}
```

- [ ] **Step 2: `email.service.ts` — 반환 타입 `boolean`, 로그 레벨 `error`**

`sendInviteEmail` 시그니처와 catch 블록을 교체한다:

```typescript
async sendInviteEmail(params: InviteEmailParams): Promise<boolean> {
  try {
    await this.transporter.sendMail({
      from: this.config.get<string>("SMTP_FROM", "noreply@erdify.app"),
      to: params.to,
      subject: `[ERDify] ${params.orgName} 조직에 초대되었습니다`,
      html: `
        <div style="background:#f1f4f7;padding:40px 16px;font-family:'Helvetica Neue',Arial,sans-serif;">
          <div style="background:#fff;border:1px solid #dee3e9;border-radius:8px;overflow:hidden;max-width:480px;margin:0 auto;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
            <div style="background:linear-gradient(135deg,#0143B5 0%,#0064E0 50%,#3d8ef0 100%);padding:36px 32px;text-align:center;">
              <span style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-1px;">ERDify</span>
              <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:8px 0 0;">팀 초대가 도착했습니다</p>
            </div>
            <div style="padding:32px;">
              <p style="color:#1c2b33;font-size:14px;line-height:1.7;margin:0 0 24px;">
                <strong>${params.inviterName}</strong>님이 <strong>${params.orgName}</strong> 조직에<br>
                <strong>${params.role}</strong> 역할로 초대하셨습니다.
              </p>
              <div style="text-align:center;">
                <a href="${params.inviteUrl}" style="background:#0064E0;color:#fff;padding:13px 32px;border-radius:100px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block;">초대 수락하기 →</a>
              </div>
              <p style="color:#bcc0c4;font-size:12px;text-align:center;margin:20px 0 0;">이 초대는 7일 후 만료됩니다.</p>
            </div>
          </div>
        </div>
      `,
    });
    return true;
  } catch (err) {
    this.logger.error(
      `Failed to send invite email to ${params.to}`,
      (err as Error).stack
    );
    return false;
  }
}
```

- [ ] **Step 3: `organization.service.ts` — 이메일 발송 결과 로그**

`inviteByEmail`의 이메일 발송 부분을 수정한다:

```typescript
const sent = await this.emailService.sendInviteEmail({
  to: email,
  orgName: org!.name,
  inviterName: inviter!.name,
  role,
  inviteUrl: `${appUrl}/register?inviteEmail=${encodeURIComponent(email)}`,
});
if (!sent) {
  this.logger.warn(`Invite email not delivered to ${email}`);
}
```

`Logger` 인스턴스를 `OrganizationService`에 추가한다:
```typescript
import { Logger } from "@nestjs/common";

export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);
  // ...
}
```

- [ ] **Step 4: `mcp-sessions.controller.ts` — `{ ok: true }` → NO_CONTENT**

`recordToolCall`과 `revertSession` 메서드를 교체한다:

```typescript
@Post(":sessionId/tool-calls")
@HttpCode(HttpStatus.NO_CONTENT)
async recordToolCall(
  @CurrentUser() user: JwtPayload,
  @Param("diagramId") diagramId: string,
  @Param("sessionId") sessionId: string,
  @Body() dto: RecordToolCallDto
): Promise<void> {
  await this.mcpSessionsService.recordToolCall(diagramId, sessionId, user.sub, {
    tool: dto.tool,
    summary: dto.summary,
  });
}

@Post(":sessionId/revert")
@HttpCode(HttpStatus.NO_CONTENT)
async revertSession(
  @CurrentUser() user: JwtPayload,
  @Param("diagramId") diagramId: string,
  @Param("sessionId") sessionId: string
): Promise<void> {
  await this.mcpSessionsService.revertSession(diagramId, sessionId, user.sub);
}
```

`HttpStatus` import 추가:
```typescript
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from "@nestjs/common";
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
cd apps/api && pnpm test
```

Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add apps/api/src/modules/collaboration/collaboration.gateway.ts \
        apps/api/src/modules/email/email.service.ts \
        apps/api/src/modules/organization/organization.service.ts \
        apps/api/src/modules/diagrams/mcp-sessions.controller.ts
git commit -m "fix(api): improve error handling — gateway logging, email boolean return, NO_CONTENT responses"
```

---

## Task 8: 타입·설정 개선

**Files:**
- Create: `apps/api/src/common/config/app.config.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/modules/collaboration/collaboration.service.ts`
- Modify: `apps/api/src/modules/organization/organization.service.ts`
- Modify: `apps/api/src/modules/diagrams/dto/add-column.dto.ts`

- [ ] **Step 1: `app.config.ts` 생성**

`apps/api/src/common/config/app.config.ts`:

```typescript
import { registerAs } from "@nestjs/config";

export default registerAs("app", () => ({
  persistIntervalMs: parseInt(process.env["PERSIST_INTERVAL_MS"] ?? "30000", 10),
  inviteExpiryDays: parseInt(process.env["INVITE_EXPIRY_DAYS"] ?? "7", 10),
}));
```

- [ ] **Step 2: `app.module.ts`에 config 등록**

`ConfigModule.forRoot(...)` 라인을 교체한다:

```typescript
import appConfig from "./common/config/app.config";

// ...

ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
```

- [ ] **Step 3: `CollaborationService` — 하드코딩된 30_000 제거**

`collaboration.service.ts` 생성자와 `schedulePersist`를 수정한다:

```typescript
import { ConfigService } from "@nestjs/config";

@Injectable()
export class CollaborationService {
  private readonly persistIntervalMs: number;

  constructor(
    @InjectRepository(Diagram)
    private readonly diagramRepo: Repository<Diagram>,
    private readonly config: ConfigService
  ) {
    this.persistIntervalMs = this.config.get<number>("app.persistIntervalMs", 30_000);
  }

  // ...

  schedulePersist(diagramId: string): void {
    const room = this.rooms.get(diagramId);
    if (!room) return;
    clearTimeout(room.persistTimer);
    room.persistTimer = setTimeout(() => void this.persistNow(diagramId), this.persistIntervalMs);
  }
}
```

- [ ] **Step 4: `OrganizationService` — 초대 만료 하드코딩 제거**

`organization.service.ts`의 `inviteByEmail` 내 만료일 계산을 교체한다:

```typescript
// constructor에 추가 (config는 이미 주입되어 있음)
private readonly inviteExpiryMs: number;

constructor(...) {
  // 기존 constructor body 뒤에 추가
  this.inviteExpiryMs =
    this.config.get<number>("app.inviteExpiryDays", 7) * 24 * 60 * 60 * 1000;
}
```

`inviteByEmail`의 만료일 계산:
```typescript
// 변경 전
const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

// 변경 후
const expiresAt = new Date(Date.now() + this.inviteExpiryMs);
```

- [ ] **Step 5: `AddColumnDto` — 기본값 DTO 레벨로 이동**

`apps/api/src/modules/diagrams/dto/add-column.dto.ts`:

```typescript
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class AddColumnDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  type!: string;

  @IsOptional()
  @IsBoolean()
  nullable?: boolean = true;

  @IsOptional()
  @IsBoolean()
  primaryKey?: boolean = false;

  @IsOptional()
  @IsBoolean()
  unique?: boolean = false;

  @IsOptional()
  defaultValue?: string | null;
}
```

`diagrams-schema.service.ts`의 `addColumn` 내 `?? true`, `?? false`, `?? null` 제거:

```typescript
const column: DiagramColumn = {
  id: randomUUID(),
  name: dto.name,
  type: dto.type,
  nullable: dto.nullable ?? true,      // DTO 기본값으로 보장되지만 ?? 방어 유지
  primaryKey: dto.primaryKey ?? false,
  unique: dto.unique ?? false,
  defaultValue: dto.defaultValue ?? null,
  comment: null,
  ordinal: entity.columns.length,
};
```

> DTO의 class-transformer가 적용되는 경우에만 기본값이 주입된다. `ValidationPipe`에 `transform: true`가 설정되어 있지 않으면 서비스의 `??` fallback이 여전히 필요하다. 따라서 서비스의 `??` 코드는 그대로 유지한다.

- [ ] **Step 6: 테스트 통과 확인**

```bash
cd apps/api && pnpm test
```

Expected: PASS

- [ ] **Step 7: 타입 체크**

```bash
cd apps/api && pnpm typecheck
```

Expected: 에러 없음

- [ ] **Step 8: 커밋**

```bash
git add apps/api/src/common/config/ \
        apps/api/src/app.module.ts \
        apps/api/src/modules/collaboration/collaboration.service.ts \
        apps/api/src/modules/organization/organization.service.ts \
        apps/api/src/modules/diagrams/dto/add-column.dto.ts
git commit -m "refactor(api): extract app config, fix AddColumnDto defaults"
```

---

## 최종 검증

- [ ] **전체 테스트 실행**

```bash
cd apps/api && pnpm test
```

Expected: 전체 PASS

- [ ] **타입 체크**

```bash
cd apps/api && pnpm typecheck
```

Expected: 에러 없음
