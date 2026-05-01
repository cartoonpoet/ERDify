# Share Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인 없이 ERD를 뷰어로 볼 수 있는 시간 제한 공유 링크 기능 구현

**Architecture:** Diagram 엔티티에 `shareToken`/`shareExpiresAt` 컬럼 추가. 백엔드에 share 생성/삭제 엔드포인트(인증 필요)와 공개 조회 엔드포인트(인증 불필요) 추가. 프론트엔드에 `/share/:shareToken` public 라우트 + ShareDiagramModal + DiagramGrid 컨텍스트 메뉴를 추가.

**Tech Stack:** NestJS, TypeORM, PostgreSQL, React, Zustand, TanStack Query, Vanilla Extract, Lucide React

---

## File Map

### 신규 생성
- `packages/db/src/migrations/1746000000008-AddShareTokenToDiagrams.ts`
- `apps/api/src/modules/diagrams/dto/share-diagram.dto.ts`
- `apps/api/src/modules/diagrams/public-diagrams.controller.ts`
- `apps/web/src/features/shared-diagram/pages/SharedDiagramPage.tsx`
- `apps/web/src/features/shared-diagram/pages/shared-diagram-page.css.ts`
- `apps/web/src/features/editor/components/ShareDiagramModal.tsx`
- `apps/web/src/features/editor/components/share-diagram-modal.css.ts`

### 수정
- `packages/db/src/entities/diagram.entity.ts` — shareToken, shareExpiresAt 컬럼 추가
- `packages/db/src/data-source.ts` — 새 migration 등록
- `apps/api/src/modules/diagrams/diagrams.service.ts` — 3개 메서드 추가
- `apps/api/src/modules/diagrams/diagrams.controller.ts` — share 엔드포인트 2개 추가
- `apps/api/src/modules/diagrams/diagrams.module.ts` — PublicDiagramsController 등록
- `apps/api/src/modules/diagrams/diagrams.service.spec.ts` — 신규 메서드 테스트 추가
- `apps/web/src/shared/api/diagrams.api.ts` — API 함수 3개 + 인터페이스 추가
- `apps/web/src/app/Router.tsx` — `/share/:shareToken` public 라우트 추가
- `apps/web/src/features/editor/pages/EditorPage.tsx` — 공유 버튼 추가
- `apps/web/src/features/dashboard/components/DiagramGrid.tsx` — ⋮ 컨텍스트 메뉴로 교체
- `apps/web/src/features/dashboard/components/DiagramGrid.css.ts` — 컨텍스트 메뉴 스타일

---

## Task 1: DB 마이그레이션 파일 생성

**Files:**
- Create: `packages/db/src/migrations/1746000000008-AddShareTokenToDiagrams.ts`

- [ ] **Step 1: 마이그레이션 파일 생성**

```typescript
// packages/db/src/migrations/1746000000008-AddShareTokenToDiagrams.ts
import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddShareTokenToDiagrams1746000000008 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "diagrams"
        ADD COLUMN IF NOT EXISTS "share_token" VARCHAR(36),
        ADD COLUMN IF NOT EXISTS "share_expires_at" TIMESTAMPTZ
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_diagrams_share_token"
        ON "diagrams" ("share_token")
        WHERE "share_token" IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_diagrams_share_token"`);
    await queryRunner.query(`
      ALTER TABLE "diagrams"
        DROP COLUMN IF EXISTS "share_token",
        DROP COLUMN IF EXISTS "share_expires_at"
    `);
  }
}
```

- [ ] **Step 2: Diagram 엔티티에 컬럼 추가**

`packages/db/src/entities/diagram.entity.ts` 파일을 다음으로 교체:

```typescript
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";
import type { DiagramVersion } from "./diagram-version.entity";
import type { Project } from "./project.entity";

@Entity("diagrams")
export class Diagram {
  @PrimaryColumn("varchar", { length: 36 })
  id!: string;

  @Column({ name: "project_id", length: 36 })
  projectId!: string;

  @Column({ length: 100 })
  name!: string;

  @Column({ type: "jsonb" })
  content!: object;

  @Column({ type: "varchar", name: "created_by", length: 36, nullable: true })
  createdBy!: string | null;

  @Column({ type: "varchar", name: "share_token", length: 36, nullable: true, unique: true })
  shareToken!: string | null;

  @Column({ type: "timestamptz", name: "share_expires_at", nullable: true })
  shareExpiresAt!: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @ManyToOne("Project", "diagrams")
  @JoinColumn({ name: "project_id" })
  project!: Project;

  @OneToMany("DiagramVersion", "diagram")
  versions!: DiagramVersion[];
}
```

- [ ] **Step 3: data-source.ts에 migration 등록**

`packages/db/src/data-source.ts`에서 import와 migrations 배열에 추가:

```typescript
import { AddShareTokenToDiagrams1746000000008 } from "./migrations/1746000000008-AddShareTokenToDiagrams";
```

그리고 `migrations` 배열 마지막에:
```typescript
AddShareTokenToDiagrams1746000000008,
```

- [ ] **Step 4: 마이그레이션 실행**

```bash
cd packages/db && pnpm migration:run
```

Expected: `migration AddShareTokenToDiagrams1746000000008 has been executed successfully`

- [ ] **Step 5: 커밋**

```bash
git add packages/db/src/migrations/1746000000008-AddShareTokenToDiagrams.ts \
        packages/db/src/entities/diagram.entity.ts \
        packages/db/src/data-source.ts
git commit -m "feat(db): add share_token and share_expires_at columns to diagrams"
```

---

## Task 2: ShareDiagramDto 생성

**Files:**
- Create: `apps/api/src/modules/diagrams/dto/share-diagram.dto.ts`

- [ ] **Step 1: DTO 파일 생성**

```typescript
// apps/api/src/modules/diagrams/dto/share-diagram.dto.ts
import { IsEnum } from "class-validator";

export type SharePreset = "1h" | "1d" | "7d" | "30d";

export class ShareDiagramDto {
  @IsEnum(["1h", "1d", "7d", "30d"])
  preset!: SharePreset;
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/api/src/modules/diagrams/dto/share-diagram.dto.ts
git commit -m "feat(api): add ShareDiagramDto"
```

---

## Task 3: DiagramsService — share 메서드 추가 + 테스트

**Files:**
- Modify: `apps/api/src/modules/diagrams/diagrams.service.ts`
- Modify: `apps/api/src/modules/diagrams/diagrams.service.spec.ts`

- [ ] **Step 1: 실패 테스트 작성**

`apps/api/src/modules/diagrams/diagrams.service.spec.ts` 파일 끝 `describe("DiagramsService"` 블록 안에 추가:

```typescript
describe("generateShareLink", () => {
  it("generates shareToken and expiresAt for editor", async () => {
    const diagram = makeDiagram({ shareToken: null, shareExpiresAt: null });
    projectRepo.findOne.mockResolvedValue(makeProject());
    diagramRepo.findOne.mockResolvedValue(diagram);
    memberRepo.findOne.mockResolvedValue(makeMember("editor"));
    diagramRepo.save.mockImplementation(async (d: Diagram) => d);

    const result = await service.generateShareLink("diag-1", "user-1", "1d");

    expect(result.shareToken).toHaveLength(36);
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("throws ForbiddenException for viewer", async () => {
    projectRepo.findOne.mockResolvedValue(makeProject());
    diagramRepo.findOne.mockResolvedValue(makeDiagram());
    memberRepo.findOne.mockResolvedValue(makeMember("viewer"));

    await expect(service.generateShareLink("diag-1", "user-1", "1d")).rejects.toThrow(ForbiddenException);
  });
});

describe("revokeShareLink", () => {
  it("clears shareToken and shareExpiresAt", async () => {
    const diagram = makeDiagram({ shareToken: "tok-abc", shareExpiresAt: new Date() });
    projectRepo.findOne.mockResolvedValue(makeProject());
    diagramRepo.findOne.mockResolvedValue(diagram);
    memberRepo.findOne.mockResolvedValue(makeMember("editor"));
    diagramRepo.save.mockImplementation(async (d: Diagram) => d);

    await service.revokeShareLink("diag-1", "user-1");

    expect(diagramRepo.save).toHaveBeenCalledWith(expect.objectContaining({ shareToken: null, shareExpiresAt: null }));
  });
});

describe("getPublicDiagram", () => {
  it("returns id, name, content for valid token", async () => {
    const future = new Date(Date.now() + 86400000);
    diagramRepo.findOne.mockResolvedValue(makeDiagram({ shareToken: "tok-abc", shareExpiresAt: future, name: "ERD" }));

    const result = await service.getPublicDiagram("tok-abc");

    expect(result).toEqual({ id: "diag-1", name: "ERD", content: {} });
  });

  it("throws NotFoundException for unknown token", async () => {
    diagramRepo.findOne.mockResolvedValue(null);

    await expect(service.getPublicDiagram("bad-tok")).rejects.toThrow(NotFoundException);
  });

  it("throws ForbiddenException for expired token", async () => {
    const past = new Date(Date.now() - 1000);
    diagramRepo.findOne.mockResolvedValue(makeDiagram({ shareToken: "tok-abc", shareExpiresAt: past }));

    await expect(service.getPublicDiagram("tok-abc")).rejects.toThrow(ForbiddenException);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd apps/api && pnpm test
```

Expected: `generateShareLink`, `revokeShareLink`, `getPublicDiagram` 관련 테스트 실패

- [ ] **Step 3: 서비스 메서드 구현**

`apps/api/src/modules/diagrams/diagrams.service.ts`에서:

import 라인에 `SharePreset` 추가:
```typescript
import type { ShareDiagramDto, SharePreset } from "./dto/share-diagram.dto";
```

클래스 안 `remove` 메서드 다음에 추가:

```typescript
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
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd apps/api && pnpm test
```

Expected: 모든 테스트 PASS

- [ ] **Step 5: 커밋**

```bash
git add apps/api/src/modules/diagrams/diagrams.service.ts \
        apps/api/src/modules/diagrams/diagrams.service.spec.ts
git commit -m "feat(api): add generateShareLink, revokeShareLink, getPublicDiagram to DiagramsService"
```

---

## Task 4: Controller 엔드포인트 + PublicDiagramsController

**Files:**
- Modify: `apps/api/src/modules/diagrams/diagrams.controller.ts`
- Create: `apps/api/src/modules/diagrams/public-diagrams.controller.ts`
- Modify: `apps/api/src/modules/diagrams/diagrams.module.ts`

- [ ] **Step 1: DiagramsController에 share 엔드포인트 추가**

`apps/api/src/modules/diagrams/diagrams.controller.ts`에서 import에 `Body`, `ShareDiagramDto` 추가 후 `remove` 메서드 다음에:

import 첫 줄 수정:
```typescript
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from "@nestjs/common";
```

그 아래 import 추가:
```typescript
import type { ShareDiagramDto } from "./dto/share-diagram.dto";
```

클래스 안 `remove` 다음에:
```typescript
@Post("diagrams/:id/share")
shareLink(
  @CurrentUser() user: JwtPayload,
  @Param("id") id: string,
  @Body() dto: ShareDiagramDto
) {
  return this.diagramsService.generateShareLink(id, user.sub, dto.preset);
}

@Delete("diagrams/:id/share")
@HttpCode(HttpStatus.NO_CONTENT)
revokeLink(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
  return this.diagramsService.revokeShareLink(id, user.sub);
}
```

- [ ] **Step 2: PublicDiagramsController 생성**

```typescript
// apps/api/src/modules/diagrams/public-diagrams.controller.ts
import { Controller, Get, Param } from "@nestjs/common";
import { DiagramsService } from "./diagrams.service";

@Controller()
export class PublicDiagramsController {
  constructor(private readonly diagramsService: DiagramsService) {}

  @Get("diagrams/public/:shareToken")
  getPublic(@Param("shareToken") shareToken: string) {
    return this.diagramsService.getPublicDiagram(shareToken);
  }
}
```

- [ ] **Step 3: DiagramsModule에 등록**

`apps/api/src/modules/diagrams/diagrams.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Diagram, DiagramVersion, OrganizationMember, Project } from "@erdify/db";
import { PublicDiagramsController } from "./public-diagrams.controller";
import { DiagramsController } from "./diagrams.controller";
import { DiagramsService } from "./diagrams.service";

@Module({
  imports: [TypeOrmModule.forFeature([Diagram, DiagramVersion, Project, OrganizationMember])],
  controllers: [PublicDiagramsController, DiagramsController],
  providers: [DiagramsService],
  exports: [DiagramsService]
})
export class DiagramsModule {}
```

`PublicDiagramsController`를 `DiagramsController` 앞에 등록해서 `/diagrams/public/:shareToken`이 `/diagrams/:id`보다 우선 매칭되도록 한다.

- [ ] **Step 4: API 빌드 확인**

```bash
cd apps/api && pnpm build 2>&1 | tail -5
```

Expected: 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add apps/api/src/modules/diagrams/diagrams.controller.ts \
        apps/api/src/modules/diagrams/public-diagrams.controller.ts \
        apps/api/src/modules/diagrams/diagrams.module.ts
git commit -m "feat(api): add share/revoke endpoints and public diagram viewer endpoint"
```

---

## Task 5: 프론트엔드 — lucide-react 설치 + API 추가

**Files:**
- Modify: `apps/web/src/shared/api/diagrams.api.ts`

- [ ] **Step 1: lucide-react 설치**

```bash
pnpm --filter @erdify/web add lucide-react
```

Expected: `apps/web/node_modules/lucide-react` 생성

- [ ] **Step 2: DiagramResponse 인터페이스 + API 함수 추가**

`apps/web/src/shared/api/diagrams.api.ts` 파일에서 `DiagramResponse` 인터페이스에 필드 추가:

```typescript
export interface DiagramResponse {
  id: string;
  projectId: string;
  organizationId: string;
  name: string;
  content: DiagramDocument;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  myRole: "owner" | "editor" | "viewer";
  shareToken: string | null;
  shareExpiresAt: string | null;
}
```

파일 맨 아래에 추가:

```typescript
export type SharePreset = "1h" | "1d" | "7d" | "30d";

export interface ShareLinkResponse {
  shareToken: string;
  expiresAt: string;
}

export interface PublicDiagramResponse {
  id: string;
  name: string;
  content: DiagramDocument;
}

export function shareDiagram(diagramId: string, preset: SharePreset): Promise<ShareLinkResponse> {
  return httpClient
    .post<ShareLinkResponse>(`/diagrams/${diagramId}/share`, { preset })
    .then((r) => r.data);
}

export function revokeDiagramShare(diagramId: string): Promise<void> {
  return httpClient.delete(`/diagrams/${diagramId}/share`).then(() => undefined);
}

export function getPublicDiagram(shareToken: string): Promise<PublicDiagramResponse> {
  return httpClient
    .get<PublicDiagramResponse>(`/diagrams/public/${shareToken}`)
    .then((r) => r.data);
}
```

- [ ] **Step 3: 타입 체크**

```bash
npx tsc --noEmit -p apps/web/tsconfig.json 2>&1 | head -20
```

Expected: 출력 없음

- [ ] **Step 4: 커밋**

```bash
git add apps/web/src/shared/api/diagrams.api.ts
git commit -m "feat(web): add share API functions and update DiagramResponse"
```

---

## Task 6: SharedDiagramPage — 공개 뷰어 페이지

**Files:**
- Create: `apps/web/src/features/shared-diagram/pages/SharedDiagramPage.tsx`
- Create: `apps/web/src/features/shared-diagram/pages/shared-diagram-page.css.ts`
- Modify: `apps/web/src/app/Router.tsx`

- [ ] **Step 1: CSS 파일 생성**

```typescript
// apps/web/src/features/shared-diagram/pages/shared-diagram-page.css.ts
import { style } from "@vanilla-extract/css";
import { vars } from "../../../../design-system/tokens.css";

export const root = style({
  display: "flex",
  flexDirection: "column",
  height: "100vh",
});

export const topbar = style({
  padding: `${vars.space["2"]} ${vars.space["4"]}`,
  borderBottom: `1px solid ${vars.color.border}`,
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  background: vars.color.surface,
});

export const diagramName = style({
  fontWeight: "600",
  fontSize: "14px",
  color: vars.color.textPrimary,
});

export const readOnlyBadge = style({
  fontSize: "11px",
  fontWeight: "500",
  color: vars.color.textSecondary,
  background: vars.color.surfaceSecondary,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.pill,
  padding: `2px 8px`,
});

export const content = style({
  flex: 1,
  display: "flex",
  overflow: "hidden",
});

export const errorPage = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100vh",
  gap: vars.space["3"],
  color: vars.color.textSecondary,
  fontSize: "14px",
});

export const errorTitle = style({
  fontSize: "18px",
  fontWeight: "700",
  color: vars.color.textPrimary,
});
```

- [ ] **Step 2: SharedDiagramPage 컴포넌트 생성**

```typescript
// apps/web/src/features/shared-diagram/pages/SharedDiagramPage.tsx
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { getPublicDiagram } from "../../../shared/api/diagrams.api";
import { useEditorStore } from "../../editor/stores/useEditorStore";
import { EditorCanvas } from "../../editor/components/EditorCanvas";
import { Skeleton } from "../../../design-system/Skeleton";
import * as css from "./shared-diagram-page.css";

export const SharedDiagramPage = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const { setDocument, setCanEdit } = useEditorStore();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["public-diagram", shareToken],
    queryFn: () => getPublicDiagram(shareToken!),
    enabled: !!shareToken,
    retry: false,
  });

  useEffect(() => {
    if (data) {
      setDocument(data.content);
      setCanEdit(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);

  if (isLoading) {
    return (
      <div className={css.root}>
        <div className={css.topbar}>
          <Skeleton width={160} height={14} />
          <Skeleton width={60} height={20} />
        </div>
        <div className={css.content}>
          <Skeleton style={{ flex: 1, borderRadius: 0 }} />
        </div>
      </div>
    );
  }

  if (isError) {
    const status = (error as AxiosError)?.response?.status;
    return (
      <div className={css.errorPage}>
        <div className={css.errorTitle}>
          {status === 403 ? "링크가 만료되었습니다" : "존재하지 않는 공유 링크입니다"}
        </div>
        <div>
          {status === 403
            ? "공유 링크의 유효 기간이 지났습니다."
            : "링크가 잘못되었거나 삭제된 링크입니다."}
        </div>
      </div>
    );
  }

  return (
    <div className={css.root}>
      <div className={css.topbar}>
        <span className={css.diagramName}>{data?.name}</span>
        <span className={css.readOnlyBadge}>읽기 전용</span>
      </div>
      <div className={css.content}>
        <EditorCanvas />
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Router에 public 라우트 추가**

`apps/web/src/app/Router.tsx`:

```typescript
import { Route, Routes } from "react-router-dom";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { RegisterPage } from "../features/auth/pages/RegisterPage";
import { EditorPage } from "../features/editor/pages/EditorPage";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import { SharedDiagramPage } from "../features/shared-diagram/pages/SharedDiagramPage";
import { ProtectedRoute } from "./routes/ProtectedRoute";

export const Router = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/share/:shareToken" element={<SharedDiagramPage />} />
    <Route element={<ProtectedRoute />}>
      <Route path="/diagrams/:diagramId" element={<EditorPage />} />
      <Route path="/*" element={<DashboardPage />} />
    </Route>
  </Routes>
);
```

- [ ] **Step 4: 타입 체크**

```bash
npx tsc --noEmit -p apps/web/tsconfig.json 2>&1 | head -20
```

Expected: 출력 없음

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/features/shared-diagram/ apps/web/src/app/Router.tsx
git commit -m "feat(web): add SharedDiagramPage and /share/:shareToken public route"
```

---

## Task 7: ShareDiagramModal

**Files:**
- Create: `apps/web/src/features/editor/components/ShareDiagramModal.tsx`
- Create: `apps/web/src/features/editor/components/share-diagram-modal.css.ts`

- [ ] **Step 1: CSS 파일 생성**

```typescript
// apps/web/src/features/editor/components/share-diagram-modal.css.ts
import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const body = style({
  padding: vars.space["4"],
  display: "flex",
  flexDirection: "column",
  gap: vars.space["4"],
  minWidth: "360px",
});

export const description = style({
  fontSize: "13px",
  color: vars.color.textSecondary,
  lineHeight: 1.6,
  margin: 0,
});

export const presetRow = style({
  display: "flex",
  gap: vars.space["2"],
  flexWrap: "wrap",
});

export const presetBtn = style({
  flex: 1,
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  borderRadius: vars.radius.sm,
  border: `1.5px solid ${vars.color.border}`,
  background: vars.color.surface,
  color: vars.color.textPrimary,
  fontSize: "13px",
  fontWeight: "500",
  cursor: "pointer",
  fontFamily: vars.font.family,
  transition: "border-color 150ms ease, background 150ms ease",
  selectors: {
    "&:hover": {
      borderColor: vars.color.primary,
      background: vars.color.surfaceSecondary,
    },
    "&:disabled": {
      opacity: 0.5,
      cursor: "not-allowed",
    },
  },
});

export const linkBox = style({
  display: "flex",
  gap: vars.space["2"],
  alignItems: "center",
});

export const linkInput = style({
  flex: 1,
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  borderRadius: vars.radius.sm,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.surfaceSecondary,
  color: vars.color.textPrimary,
  fontSize: "12px",
  fontFamily: vars.font.family,
  outline: "none",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const copyBtn = style({
  display: "flex",
  alignItems: "center",
  gap: "4px",
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  borderRadius: vars.radius.sm,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.surface,
  color: vars.color.textPrimary,
  fontSize: "12px",
  fontWeight: "600",
  cursor: "pointer",
  fontFamily: vars.font.family,
  whiteSpace: "nowrap",
  transition: "background 150ms ease",
  selectors: {
    "&:hover": { background: vars.color.surfaceSecondary },
  },
});

export const expiry = style({
  fontSize: "12px",
  color: vars.color.textSecondary,
  margin: 0,
});

export const sectionLabel = style({
  fontSize: "12px",
  fontWeight: "600",
  color: vars.color.textPrimary,
  margin: 0,
});

export const divider = style({
  height: "1px",
  background: vars.color.border,
});

export const revokeBtn = style({
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  borderRadius: vars.radius.sm,
  border: `1.5px solid ${vars.color.error}`,
  background: "transparent",
  color: vars.color.error,
  fontSize: "13px",
  fontWeight: "500",
  cursor: "pointer",
  fontFamily: vars.font.family,
  transition: "background 150ms ease",
  alignSelf: "flex-start",
  selectors: {
    "&:hover": { background: "#fef2f2" },
    "&:disabled": { opacity: 0.5, cursor: "not-allowed" },
  },
});
```

- [ ] **Step 2: ShareDiagramModal 컴포넌트 생성**

```typescript
// apps/web/src/features/editor/components/ShareDiagramModal.tsx
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, Check } from "lucide-react";
import { Modal } from "../../../design-system";
import { shareDiagram, revokeDiagramShare } from "../../../shared/api/diagrams.api";
import type { SharePreset } from "../../../shared/api/diagrams.api";
import * as css from "./share-diagram-modal.css";

const PRESET_LABELS: Record<SharePreset, string> = {
  "1h": "1시간",
  "1d": "1일",
  "7d": "7일",
  "30d": "30일",
};

const PRESETS: SharePreset[] = ["1h", "1d", "7d", "30d"];

interface ShareDiagramModalProps {
  open: boolean;
  diagramId: string;
  initialShareToken: string | null;
  initialExpiresAt: string | null;
  onClose: () => void;
}

export const ShareDiagramModal = ({
  open,
  diagramId,
  initialShareToken,
  initialExpiresAt,
  onClose,
}: ShareDiagramModalProps) => {
  const queryClient = useQueryClient();
  const [shareToken, setShareToken] = useState(initialShareToken);
  const [expiresAt, setExpiresAt] = useState(initialExpiresAt);
  const [copied, setCopied] = useState(false);

  const shareUrl = shareToken ? `${window.location.origin}/share/${shareToken}` : null;

  const shareMutation = useMutation({
    mutationFn: (preset: SharePreset) => shareDiagram(diagramId, preset),
    onSuccess: (data) => {
      setShareToken(data.shareToken);
      setExpiresAt(data.expiresAt);
      void queryClient.invalidateQueries({ queryKey: ["diagram", diagramId] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: () => revokeDiagramShare(diagramId),
    onSuccess: () => {
      setShareToken(null);
      setExpiresAt(null);
      void queryClient.invalidateQueries({ queryKey: ["diagram", diagramId] });
    },
  });

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isLoading = shareMutation.isPending || revokeMutation.isPending;

  return (
    <Modal open={open} onClose={onClose} title="공유하기">
      <div className={css.body}>
        {shareToken ? (
          <>
            <div className={css.linkBox}>
              <input className={css.linkInput} value={shareUrl ?? ""} readOnly />
              <button className={css.copyBtn} onClick={handleCopy}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "복사됨" : "복사"}
              </button>
            </div>

            {expiresAt && (
              <p className={css.expiry}>
                유효 기간: {new Date(expiresAt).toLocaleString("ko-KR")}까지
              </p>
            )}

            <div className={css.divider} />

            <p className={css.sectionLabel}>만료 시간 변경</p>
            <div className={css.presetRow}>
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  className={css.presetBtn}
                  onClick={() => shareMutation.mutate(preset)}
                  disabled={isLoading}
                >
                  {PRESET_LABELS[preset]}
                </button>
              ))}
            </div>

            <button
              className={css.revokeBtn}
              onClick={() => revokeMutation.mutate()}
              disabled={isLoading}
            >
              링크 비활성화
            </button>
          </>
        ) : (
          <>
            <p className={css.description}>
              만료 시간을 선택하면 공유 링크가 생성됩니다.
              <br />
              링크를 받은 사람은 로그인 없이 ERD를 읽기 전용으로 볼 수 있습니다.
            </p>
            <div className={css.presetRow}>
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  className={css.presetBtn}
                  onClick={() => shareMutation.mutate(preset)}
                  disabled={isLoading}
                >
                  {PRESET_LABELS[preset]}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
```

- [ ] **Step 3: 타입 체크**

```bash
npx tsc --noEmit -p apps/web/tsconfig.json 2>&1 | head -20
```

Expected: 출력 없음

- [ ] **Step 4: 커밋**

```bash
git add apps/web/src/features/editor/components/ShareDiagramModal.tsx \
        apps/web/src/features/editor/components/share-diagram-modal.css.ts
git commit -m "feat(web): add ShareDiagramModal with preset selection and link copy"
```

---

## Task 8: EditorPage — 공유 버튼 추가

**Files:**
- Modify: `apps/web/src/features/editor/pages/EditorPage.tsx`

- [ ] **Step 1: 공유 버튼 + 모달 추가**

`apps/web/src/features/editor/pages/EditorPage.tsx`:

import에 추가:
```typescript
import { Share2 } from "lucide-react";
import { ShareDiagramModal } from "../components/ShareDiagramModal";
```

`const [showExport, setShowExport] = useState(false);` 다음 줄에:
```typescript
const [showShare, setShowShare] = useState(false);
```

topbar에서 `<PresenceIndicator />` 다음에 공유 버튼 추가:
```tsx
<button
  onClick={() => setShowShare(true)}
  className={css.topbarBtn({ variant: "secondary" })}
  style={{ display: "flex", alignItems: "center", gap: "4px" }}
>
  <Share2 size={13} /> 공유
</button>
```

return 블록의 `<ExportDdlModal .../>` 다음에:
```tsx
<ShareDiagramModal
  open={showShare}
  diagramId={diagramId!}
  initialShareToken={data?.shareToken ?? null}
  initialExpiresAt={data?.shareExpiresAt ?? null}
  onClose={() => setShowShare(false)}
/>
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit -p apps/web/tsconfig.json 2>&1 | head -20
```

Expected: 출력 없음

- [ ] **Step 3: 커밋**

```bash
git add apps/web/src/features/editor/pages/EditorPage.tsx
git commit -m "feat(web): add share button to EditorPage topbar"
```

---

## Task 9: DiagramGrid — ⋮ 컨텍스트 메뉴 + 공유 연결

**Files:**
- Modify: `apps/web/src/features/dashboard/components/DiagramGrid.tsx`
- Modify: `apps/web/src/features/dashboard/components/DiagramGrid.css.ts`

- [ ] **Step 1: CSS에 컨텍스트 메뉴 스타일 추가**

`apps/web/src/features/dashboard/components/DiagramGrid.css.ts`에서 `cardDeleteBtn` 스타일 블록 전체를 다음으로 교체:

```typescript
export const ctxBtn = style({
  position: "absolute",
  top: vars.space["2"],
  right: vars.space["2"],
  width: "24px",
  height: "24px",
  borderRadius: vars.radius.sm,
  background: "rgba(0,0,0,0.45)",
  color: "#fff",
  border: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  opacity: 0,
  transition: "opacity 150ms ease",
  padding: 0,
  zIndex: 1,
  selectors: {
    [`${diagramCardWrapper}:hover &`]: { opacity: 1 },
    [`${diagramCardWrapper}:focus-within &`]: { opacity: 1 },
  },
});

export const ctxMenu = style({
  position: "absolute",
  top: "calc(100% - 8px)",
  right: vars.space["2"],
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  boxShadow: vars.shadow.md,
  zIndex: 20,
  overflow: "hidden",
  minWidth: "130px",
});

export const ctxItem = style({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: `9px 14px`,
  fontSize: "12px",
  color: vars.color.primary,
  fontWeight: "600",
  cursor: "pointer",
  background: "none",
  border: "none",
  width: "100%",
  textAlign: "left",
  fontFamily: vars.font.family,
  selectors: {
    "&:hover": { background: vars.color.surfaceSecondary },
  },
});

export const ctxItemDanger = style({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: `9px 14px`,
  fontSize: "12px",
  color: vars.color.error,
  cursor: "pointer",
  background: "none",
  border: "none",
  width: "100%",
  textAlign: "left",
  fontFamily: vars.font.family,
  selectors: {
    "&:hover": { background: "#fef2f2" },
  },
});

export const ctxDivider = style({
  height: "1px",
  background: vars.color.border,
});
```

- [ ] **Step 2: DiagramGrid.tsx 업데이트**

`apps/web/src/features/dashboard/components/DiagramGrid.tsx` 전체를 다음으로 교체:

```typescript
import { useState } from "react";
import type { FocusEvent } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { MoreVertical, Share2, Trash2 } from "lucide-react";
import type { DiagramResponse } from "../../../shared/api/diagrams.api";
import { Button, Skeleton } from "../../../design-system";
import { ShareDiagramModal } from "../../editor/components/ShareDiagramModal";
import {
  mainArea, mainHeader, mainTitle, filterRow, filterChip, filterChipVariants,
  grid, diagramCardWrapper, diagramCard, ctxBtn, ctxMenu, ctxItem, ctxItemDanger, ctxDivider,
  cardPreview, miniTable, miniTableHeader, miniField, cardBody, cardName, cardMeta,
  dialectBadge, newCard, newCardIcon,
} from "./DiagramGrid.css";

type FilterType = "all" | "recent" | "mine";

interface DiagramGridProps {
  diagrams: DiagramResponse[];
  projectName?: string;
  currentUserId: string | null;
  onCreateDiagram: () => void;
  onImportDiagram?: () => void;
  onDeleteDiagram: (diagramId: string) => void;
  loading?: boolean;
}

const DiagramCardPreview = ({ diagram }: { diagram: DiagramResponse }) => {
  const previewEntities = diagram.content.entities.slice(0, 2);
  if (previewEntities.length === 0) {
    return <div className={cardPreview} />;
  }
  return (
    <div className={cardPreview}>
      {previewEntities.map((entity) => (
        <div key={entity.id} className={miniTable}>
          <div className={miniTableHeader}>{entity.name}</div>
          {entity.columns.slice(0, 3).map((col) => (
            <div key={col.id} className={miniField}>{col.name}</div>
          ))}
        </div>
      ))}
    </div>
  );
};

function applyFilter(diagrams: DiagramResponse[], filter: FilterType, userId: string | null): DiagramResponse[] {
  if (filter === "recent") {
    return [...diagrams].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
  if (filter === "mine") {
    return diagrams.filter((d) => d.createdBy !== null && d.createdBy === userId);
  }
  return diagrams;
}

export const DiagramGrid = ({ diagrams, projectName, currentUserId, onCreateDiagram, onImportDiagram, onDeleteDiagram, loading = false }: DiagramGridProps) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [shareDiagram, setShareDiagram] = useState<DiagramResponse | null>(null);
  const filtered = applyFilter(diagrams, activeFilter, currentUserId);

  const handleWrapperBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setMenuOpenId(null);
  };

  return (
    <div className={mainArea}>
      <div className={mainHeader}>
        <div className={mainTitle}>{projectName ?? "프로젝트를 선택하세요"}</div>
        {projectName && onImportDiagram && (
          <Button variant="secondary" size="md" onClick={onImportDiagram}>
            가져오기
          </Button>
        )}
        {projectName && (
          <Button variant="primary" size="md" onClick={onCreateDiagram}>
            + 새 ERD
          </Button>
        )}
      </div>
      {projectName && (
        <div className={filterRow}>
          <button
            className={[filterChip, activeFilter === "all" ? filterChipVariants.active : filterChipVariants.inactive].join(" ")}
            onClick={() => setActiveFilter("all")}
          >
            전체
          </button>
          <button
            className={[filterChip, activeFilter === "recent" ? filterChipVariants.active : filterChipVariants.inactive].join(" ")}
            onClick={() => setActiveFilter("recent")}
          >
            최근 수정
          </button>
          <button
            className={[filterChip, activeFilter === "mine" ? filterChipVariants.active : filterChipVariants.inactive].join(" ")}
            onClick={() => setActiveFilter("mine")}
          >
            내가 만든
          </button>
        </div>
      )}
      {loading ? (
        <div className={grid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={140} />
          ))}
        </div>
      ) : (
        <div className={grid}>
          {filtered.map((diagram) => (
            <div
              key={diagram.id}
              className={diagramCardWrapper}
              tabIndex={0}
              onBlur={handleWrapperBlur}
            >
              <Link to={`/diagrams/${diagram.id}`} className={diagramCard}>
                <DiagramCardPreview diagram={diagram} />
                <div className={cardBody}>
                  <div className={cardName}>{diagram.name}</div>
                  <div className={cardMeta}>
                    <span className={dialectBadge}>{diagram.content.dialect}</span>
                    {formatDistanceToNow(new Date(diagram.updatedAt), { addSuffix: true, locale: ko })}
                  </div>
                </div>
              </Link>
              <button
                className={ctxBtn}
                aria-label="더보기"
                onClick={(e) => {
                  e.preventDefault();
                  setMenuOpenId(menuOpenId === diagram.id ? null : diagram.id);
                }}
              >
                <MoreVertical size={13} />
              </button>
              {menuOpenId === diagram.id && (
                <div className={ctxMenu}>
                  <button
                    className={ctxItem}
                    onClick={() => {
                      setShareDiagram(diagram);
                      setMenuOpenId(null);
                    }}
                  >
                    <Share2 size={13} /> 공유하기
                  </button>
                  <div className={ctxDivider} />
                  <button
                    className={ctxItemDanger}
                    onClick={() => {
                      if (window.confirm(`"${diagram.name}" ERD를 삭제하시겠습니까?`)) {
                        onDeleteDiagram(diagram.id);
                      }
                      setMenuOpenId(null);
                    }}
                  >
                    <Trash2 size={13} /> 삭제
                  </button>
                </div>
              )}
            </div>
          ))}
          <button className={newCard} onClick={onCreateDiagram}>
            <div className={newCardIcon}>+</div>
            새 ERD 만들기
          </button>
        </div>
      )}

      {shareDiagram && (
        <ShareDiagramModal
          open={!!shareDiagram}
          diagramId={shareDiagram.id}
          initialShareToken={shareDiagram.shareToken}
          initialExpiresAt={shareDiagram.shareExpiresAt}
          onClose={() => setShareDiagram(null)}
        />
      )}
    </div>
  );
};
```

- [ ] **Step 3: DiagramGrid.css.ts에서 사용 안 하는 cardDeleteBtn 제거 확인**

`DiagramGrid.css.ts`에서 `cardDeleteBtn` export가 남아있다면 제거.

- [ ] **Step 4: 타입 체크**

```bash
npx tsc --noEmit -p apps/web/tsconfig.json 2>&1 | head -20
```

Expected: 출력 없음

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/features/dashboard/components/DiagramGrid.tsx \
        apps/web/src/features/dashboard/components/DiagramGrid.css.ts
git commit -m "feat(web): replace card delete button with context menu including share action"
```

---

## 검증 체크리스트

전체 구현 완료 후 확인:

- [ ] `pnpm --filter @erdify/api test` → 모든 테스트 PASS
- [ ] `npx tsc --noEmit -p apps/web/tsconfig.json` → 출력 없음
- [ ] `npx tsc --noEmit -p apps/api/tsconfig.json` → 출력 없음
- [ ] 개발 서버 기동 후 에디터에서 공유 버튼 클릭 → 모달 오픈 확인
- [ ] 프리셋 선택 → 링크 생성 → 복사 버튼 동작 확인
- [ ] 생성된 링크를 시크릿 창에서 열기 → 읽기 전용 ERD 뷰어 확인
- [ ] 링크 비활성화 → 해당 링크 접근 시 만료 메시지 확인
- [ ] 대시보드 카드 ⋮ 버튼 → 컨텍스트 메뉴 확인
- [ ] 컨텍스트 메뉴에서 공유하기 → ShareDiagramModal 오픈 확인
- [ ] 컨텍스트 메뉴에서 삭제 → 기존 삭제 동작 유지 확인
