# Error Reporting System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically report client-side errors to a backend DB, send email alerts for critical errors, detect 403/404 spikes, and provide an admin UI inside the dashboard for the ERDify ops team.

**Architecture:** NestJS `ErrorReportsModule` persists reports and emails via the existing `EmailService`. A lightweight `errorReporter.ts` on the frontend posts fire-and-forget. The admin page lives at `/admin/error-reports` inside the dashboard shell, visible only to `ADMIN_EMAILS` users, with grouped rows and a slide-over detail panel.

**Tech Stack:** NestJS + TypeORM (backend), React + TanStack Query + vanilla-extract (frontend admin UI), nodemailer (existing EmailService), Vitest + Testing Library

> **Prerequisite:** Complete `2026-05-18-error-ux-improvement.md` first — Tasks 5 and 6 below modify `QueryErrorBoundary.tsx` and `DiagramGrid.tsx` which are rewritten in that plan.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `packages/db/src/entities/error-report.entity.ts` | Create | TypeORM entity for error reports |
| `packages/db/src/migrations/1746000000015-CreateErrorReportsTable.ts` | Create | DB migration |
| `packages/db/src/index.ts` | Modify | Export new entity |
| `apps/api/src/modules/error-reports/error-reports.module.ts` | Create | NestJS module wiring |
| `apps/api/src/modules/error-reports/error-reports.controller.ts` | Create | POST + GET + PATCH endpoints |
| `apps/api/src/modules/error-reports/error-reports.service.ts` | Create | DB save, email trigger, spike cron |
| `apps/api/src/modules/error-reports/error-reports.service.spec.ts` | Create | Service unit tests |
| `apps/api/src/app.module.ts` | Modify | Register ErrorReportsModule |
| `apps/web/src/shared/services/errorReporter.ts` | Create | Fire-and-forget frontend reporter with dedup |
| `apps/web/src/shared/services/errorReporter.test.ts` | Create | Reporter tests |
| `apps/web/src/shared/components/QueryErrorBoundary.tsx` | Modify | Call reportError in componentDidCatch |
| `apps/web/src/features/dashboard/components/DiagramGrid.tsx` | Modify | Call reportError on isError transition |
| `apps/web/src/shared/api/errorReports.api.ts` | Create | API client for admin endpoints |
| `apps/web/src/features/admin/pages/ErrorReportsPage.tsx` | Create | Admin error list page |
| `apps/web/src/features/admin/components/ErrorReportSlideOver.tsx` | Create | Slide-over detail + resolve |
| `apps/web/src/features/admin/admin.css.ts` | Create | Admin page styles |
| `apps/web/src/features/dashboard/components/UnifiedSidebar/SidebarBottomBar.tsx` | Modify | Add admin section for ADMIN_EMAILS users |
| `apps/web/src/router/index.tsx` | Modify | Add `/admin/error-reports` route |

---

### Task 1: DB Entity + Migration

**Files:**
- Create: `packages/db/src/entities/error-report.entity.ts`
- Create: `packages/db/src/migrations/1746000000015-CreateErrorReportsTable.ts`
- Modify: `packages/db/src/index.ts`

- [ ] **Create the entity**

```ts
// packages/db/src/entities/error-report.entity.ts
import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

export type ErrorType = "5xx" | "network" | "403" | "404";

@Entity("error_reports")
export class ErrorReport {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ name: "error_type", type: "varchar", length: 10 })
  errorType!: ErrorType;

  @Column({ name: "http_status", type: "int", nullable: true })
  httpStatus!: number | null;

  @Column({ type: "varchar", length: 500 })
  path!: string;

  @Column({ type: "varchar", length: 2000 })
  url!: string;

  @Column({ name: "user_id", type: "varchar", length: 36, nullable: true })
  userId!: string | null;

  @Column({ name: "user_agent", type: "varchar", length: 500 })
  userAgent!: string;

  @Column({ name: "resolved_at", type: "timestamptz", nullable: true })
  resolvedAt!: Date | null;

  @Column({ name: "resolved_by", type: "varchar", length: 36, nullable: true })
  resolvedBy!: string | null;

  @Column({ name: "resolved_note", type: "text", nullable: true })
  resolvedNote!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
```

- [ ] **Create the migration**

```ts
// packages/db/src/migrations/1746000000015-CreateErrorReportsTable.ts
import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateErrorReportsTable1746000000015 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE "error_reports" (
        "id"            UUID         NOT NULL,
        "error_type"    VARCHAR(10)  NOT NULL,
        "http_status"   INT,
        "path"          VARCHAR(500) NOT NULL,
        "url"           VARCHAR(2000) NOT NULL,
        "user_id"       VARCHAR(36),
        "user_agent"    VARCHAR(500) NOT NULL,
        "resolved_at"   TIMESTAMPTZ,
        "resolved_by"   VARCHAR(36),
        "resolved_note" TEXT,
        "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_error_reports" PRIMARY KEY ("id")
      )
    `);
    await runner.query(`CREATE INDEX "IDX_error_reports_error_type_path" ON "error_reports" ("error_type", "path")`);
    await runner.query(`CREATE INDEX "IDX_error_reports_created_at" ON "error_reports" ("created_at")`);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP TABLE "error_reports"`);
  }
}
```

- [ ] **Export from packages/db/src/index.ts**

Add to `packages/db/src/index.ts`:

```ts
export { ErrorReport } from "./entities/error-report.entity";
export type { ErrorType } from "./entities/error-report.entity";
```

- [ ] **Build db package to verify**

```bash
cd packages/db && pnpm build 2>&1 | tail -5
```
Expected: build succeeds with no errors

- [ ] **Commit**

```bash
git add packages/db/src/entities/error-report.entity.ts \
        packages/db/src/migrations/1746000000015-CreateErrorReportsTable.ts \
        packages/db/src/index.ts
git commit -m "feat(db): add ErrorReport entity and migration"
```

---

### Task 2: Backend Module — Controller + Service

**Files:**
- Create: `apps/api/src/modules/error-reports/error-reports.service.ts`
- Create: `apps/api/src/modules/error-reports/error-reports.controller.ts`
- Create: `apps/api/src/modules/error-reports/error-reports.module.ts`
- Create: `apps/api/src/modules/error-reports/error-reports.service.spec.ts`

- [ ] **Write the failing service tests**

```ts
// apps/api/src/modules/error-reports/error-reports.service.spec.ts
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { SchedulerRegistry } from "@nestjs/schedule";
import { ErrorReportsService } from "./error-reports.service";
import { ErrorReport } from "@erdify/db";
import { EmailService } from "../email/email.service";

const mockRepo = () => ({
  save: vi.fn(),
  find: vi.fn().mockResolvedValue([]),
  createQueryBuilder: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    addSelect: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    getRawMany: vi.fn().mockResolvedValue([]),
  }),
  update: vi.fn(),
  count: vi.fn().mockResolvedValue(0),
});

const mockEmail = () => ({ sendErrorAlertEmail: vi.fn().mockResolvedValue(true) });
const mockConfig = () => ({ get: vi.fn((key: string, def: unknown) => def) });
const mockScheduler = () => ({ addCronJob: vi.fn(), getCronJob: vi.fn() });

describe("ErrorReportsService", () => {
  let service: ErrorReportsService;
  let repo: ReturnType<typeof mockRepo>;
  let email: ReturnType<typeof mockEmail>;

  beforeEach(async () => {
    repo = mockRepo();
    email = mockEmail();
    const module = await Test.createTestingModule({
      providers: [
        ErrorReportsService,
        { provide: getRepositoryToken(ErrorReport), useValue: repo },
        { provide: EmailService, useValue: email },
        { provide: ConfigService, useValue: mockConfig() },
        { provide: SchedulerRegistry, useValue: mockScheduler() },
      ],
    }).compile();
    service = module.get(ErrorReportsService);
  });

  it("saves error report to DB", async () => {
    await service.create({
      errorType: "5xx", httpStatus: 500,
      path: "/api/test", url: "http://app/test",
      userId: "u1", userAgent: "Chrome",
    });
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ errorType: "5xx", httpStatus: 500 }),
    );
  });

  it("sends email for 5xx errors", async () => {
    await service.create({
      errorType: "5xx", httpStatus: 500,
      path: "/api/test", url: "http://app/test",
      userId: null, userAgent: "Chrome",
    });
    expect(email.sendErrorAlertEmail).toHaveBeenCalled();
  });

  it("sends email for network errors", async () => {
    await service.create({
      errorType: "network", httpStatus: null,
      path: "/api/test", url: "http://app/test",
      userId: null, userAgent: "Chrome",
    });
    expect(email.sendErrorAlertEmail).toHaveBeenCalled();
  });

  it("does NOT send email for 403 errors", async () => {
    await service.create({
      errorType: "403", httpStatus: 403,
      path: "/api/test", url: "http://app/test",
      userId: null, userAgent: "Chrome",
    });
    expect(email.sendErrorAlertEmail).not.toHaveBeenCalled();
  });

  it("does NOT send email for 404 errors", async () => {
    await service.create({
      errorType: "404", httpStatus: 404,
      path: "/api/test", url: "http://app/test",
      userId: null, userAgent: "Chrome",
    });
    expect(email.sendErrorAlertEmail).not.toHaveBeenCalled();
  });

  it("resolves matching reports", async () => {
    await service.resolve({ path: "/api/test", errorType: "5xx", resolvedById: "admin-1", note: "fixed" });
    expect(repo.update).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/test", errorType: "5xx" }),
      expect.objectContaining({ resolvedBy: "admin-1" }),
    );
  });
});
```

- [ ] **Run tests to confirm they fail**

```bash
cd apps/api && pnpm test --reporter=verbose 2>&1 | grep -E "ErrorReportsService"
```
Expected: FAIL — module not found

- [ ] **Create the service**

```ts
// apps/api/src/modules/error-reports/error-reports.service.ts
import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { randomUUID } from "crypto";
import { ErrorReport, type ErrorType } from "@erdify/db";
import { EmailService } from "../email/email.service";

export interface CreateErrorReportDto {
  errorType: ErrorType;
  httpStatus: number | null;
  path: string;
  url: string;
  userId: string | null;
  userAgent: string;
}

export interface ResolveDto {
  path: string;
  errorType: ErrorType;
  resolvedById: string;
  note?: string;
}

export interface GroupedErrorReport {
  errorType: ErrorType;
  path: string;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  resolved: boolean;
  occurrences: ErrorReport[];
}

@Injectable()
export class ErrorReportsService {
  private readonly logger = new Logger(ErrorReportsService.name);
  private lastSpikeAlertAt: Date | null = null;

  constructor(
    @InjectRepository(ErrorReport)
    private readonly repo: Repository<ErrorReport>,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreateErrorReportDto): Promise<void> {
    const report = this.repo.create({ ...dto, id: randomUUID() });
    await this.repo.save(report);

    if (dto.errorType === "5xx" || dto.errorType === "network") {
      const adminEmails = this.config.get<string>("ADMIN_EMAILS", "");
      await this.email.sendErrorAlertEmail({
        to: adminEmails,
        errorType: dto.errorType,
        httpStatus: dto.httpStatus,
        path: dto.path,
        userId: dto.userId,
        appUrl: this.config.get<string>("APP_URL", "http://localhost:5173"),
      });
    }
  }

  async findGrouped(filters: { type?: ErrorType; resolved?: boolean; from?: Date }): Promise<GroupedErrorReport[]> {
    const qb = this.repo.createQueryBuilder("r")
      .select(["r.errorType", "r.path"])
      .addSelect("COUNT(*)", "count")
      .addSelect("MIN(r.createdAt)", "firstSeen")
      .addSelect("MAX(r.createdAt)", "lastSeen")
      .addSelect("BOOL_AND(r.resolvedAt IS NOT NULL)", "resolved")
      .groupBy("r.errorType, r.path")
      .orderBy("MAX(r.createdAt)", "DESC");

    if (filters.type) qb.andWhere("r.errorType = :type", { type: filters.type });
    if (filters.resolved === false) qb.andWhere("r.resolvedAt IS NULL");
    if (filters.resolved === true) qb.andWhere("r.resolvedAt IS NOT NULL");
    if (filters.from) qb.andWhere("r.createdAt >= :from", { from: filters.from });

    const rows = await qb.getRawMany();
    return rows.map((row) => ({
      errorType: row.r_error_type as ErrorType,
      path: row.r_path,
      count: Number(row.count),
      firstSeen: new Date(row.firstSeen),
      lastSeen: new Date(row.lastSeen),
      resolved: row.resolved === true,
      occurrences: [],
    }));
  }

  async resolve(dto: ResolveDto): Promise<void> {
    await this.repo.update(
      { path: dto.path, errorType: dto.errorType, resolvedAt: IsNull() },
      { resolvedAt: new Date(), resolvedBy: dto.resolvedById, resolvedNote: dto.note ?? null },
    );
  }

  async getStats(): Promise<Record<ErrorType, number>> {
    const counts = await Promise.all(
      (["5xx", "network", "403", "404"] as ErrorType[]).map(async (t) => ({
        type: t,
        count: await this.repo.count({ where: { errorType: t, resolvedAt: IsNull() } }),
      })),
    );
    return Object.fromEntries(counts.map((c) => [c.type, c.count])) as Record<ErrorType, number>;
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkSpikes(): Promise<void> {
    const threshold = this.config.get<number>("ERROR_SPIKE_THRESHOLD", 5);
    const since = new Date(Date.now() - 10 * 60 * 1000);

    for (const type of ["403", "404"] as ErrorType[]) {
      const count = await this.repo
        .createQueryBuilder("r")
        .where("r.errorType = :type", { type })
        .andWhere("r.createdAt >= :since", { since })
        .getCount();

      if (count >= threshold) {
        const cooldown = 30 * 60 * 1000;
        if (this.lastSpikeAlertAt && Date.now() - this.lastSpikeAlertAt.getTime() < cooldown) continue;

        const adminEmails = this.config.get<string>("ADMIN_EMAILS", "");
        await this.email.sendSpikeAlertEmail({
          to: adminEmails,
          errorType: type,
          count,
          appUrl: this.config.get<string>("APP_URL", "http://localhost:5173"),
        });
        this.lastSpikeAlertAt = new Date();
      }
    }
  }
}
```

- [ ] **Create the controller**

```ts
// apps/api/src/modules/error-reports/error-reports.controller.ts
import { Body, Controller, Get, Patch, Post, Query, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ErrorReportsService, type CreateErrorReportDto, type ResolveDto } from "./error-reports.service";
import { ConfigService } from "@nestjs/config";
import type { ErrorType } from "@erdify/db";

@Controller("error-reports")
@UseGuards(JwtAuthGuard)
export class ErrorReportsController {
  constructor(
    private readonly service: ErrorReportsService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  async create(@Body() body: CreateErrorReportDto, @Req() req: { user: { id: string } }): Promise<void> {
    await this.service.create({ ...body, userId: req.user.id });
  }

  @Get()
  async findAll(
    @Req() req: { user: { email: string } },
    @Query("type") type?: ErrorType,
    @Query("resolved") resolved?: string,
    @Query("from") from?: string,
  ) {
    this.assertAdmin(req.user.email);
    const filters = {
      type,
      resolved: resolved === "true" ? true : resolved === "false" ? false : undefined,
      from: from ? new Date(from) : undefined,
    };
    const [groups, stats] = await Promise.all([
      this.service.findGrouped(filters),
      this.service.getStats(),
    ]);
    return { groups, stats };
  }

  @Patch("resolve")
  async resolve(@Body() body: { path: string; errorType: ErrorType; note?: string }, @Req() req: { user: { id: string; email: string } }): Promise<void> {
    this.assertAdmin(req.user.email);
    await this.service.resolve({ ...body, resolvedById: req.user.id });
  }

  private assertAdmin(email: string): void {
    const adminEmails = this.config.get<string>("ADMIN_EMAILS", "").split(",").map((e) => e.trim());
    if (!adminEmails.includes(email)) throw new UnauthorizedException();
  }
}
```

- [ ] **Create the module**

```ts
// apps/api/src/modules/error-reports/error-reports.module.ts
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ErrorReport } from "@erdify/db";
import { ErrorReportsController } from "./error-reports.controller";
import { ErrorReportsService } from "./error-reports.service";
import { EmailModule } from "../email/email.module";

@Module({
  imports: [TypeOrmModule.forFeature([ErrorReport]), EmailModule],
  controllers: [ErrorReportsController],
  providers: [ErrorReportsService],
})
export class ErrorReportsModule {}
```

- [ ] **Run tests to confirm they pass**

```bash
cd apps/api && pnpm test --reporter=verbose 2>&1 | grep -E "ErrorReportsService"
```
Expected: all 6 tests PASS

- [ ] **Commit**

```bash
git add apps/api/src/modules/error-reports/
git commit -m "feat(api): add ErrorReportsModule — POST/GET/PATCH endpoints, email alerts, spike cron"
```

---

### Task 3: Add email methods to EmailService + Register module

**Files:**
- Modify: `apps/api/src/modules/email/email.service.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Add sendErrorAlertEmail and sendSpikeAlertEmail to EmailService**

Add these interfaces and methods to `apps/api/src/modules/email/email.service.ts`:

After the existing `InviteEmailParams` interface, add:

```ts
export interface ErrorAlertEmailParams {
  to: string;
  errorType: string;
  httpStatus: number | null;
  path: string;
  userId: string | null;
  appUrl: string;
}

export interface SpikeAlertEmailParams {
  to: string;
  errorType: string;
  count: number;
  appUrl: string;
}
```

Add these methods to the `EmailService` class (before the closing `}`):

```ts
  async sendErrorAlertEmail(params: ErrorAlertEmailParams): Promise<boolean> {
    if (!params.to) return false;
    try {
      const statusLabel = params.httpStatus ? ` (${params.httpStatus})` : "";
      await this.transporter.sendMail({
        from: this.config.get<string>("SMTP_FROM", "noreply@erdify.app"),
        to: params.to,
        subject: `[ERDify] ${params.errorType === "network" ? "연결 오류" : "서버 오류"} — ${params.path}`,
        text: [
          `에러 타입: ${params.errorType}${statusLabel}`,
          `경로: ${params.path}`,
          `사용자: ${params.userId ?? "비로그인"}`,
          ``,
          `→ 에러 리포트 확인: ${params.appUrl}/admin/error-reports`,
        ].join("\n"),
      });
      return true;
    } catch (err) {
      this.logger.error("Failed to send error alert email", (err as Error).stack);
      return false;
    }
  }

  async sendSpikeAlertEmail(params: SpikeAlertEmailParams): Promise<boolean> {
    if (!params.to) return false;
    try {
      await this.transporter.sendMail({
        from: this.config.get<string>("SMTP_FROM", "noreply@erdify.app"),
        to: params.to,
        subject: `[ERDify] ${params.errorType} 급증 감지 — 10분간 ${params.count}건`,
        text: [
          `최근 10분간 ${params.errorType} 오류 ${params.count}건 발생`,
          ``,
          `→ 에러 리포트 확인: ${params.appUrl}/admin/error-reports`,
        ].join("\n"),
      });
      return true;
    } catch (err) {
      this.logger.error("Failed to send spike alert email", (err as Error).stack);
      return false;
    }
  }
```

- [ ] **Register ErrorReportsModule in app.module.ts**

In `apps/api/src/app.module.ts`, add to the imports array:

```ts
import { ErrorReportsModule } from "./modules/error-reports/error-reports.module";
// ... add ErrorReportsModule to @Module({ imports: [..., ErrorReportsModule] })
```

Also ensure `ScheduleModule.forRoot()` is in the imports (needed for `@Cron`). Check if it exists — if not add:

```ts
import { ScheduleModule } from "@nestjs/schedule";
// add ScheduleModule.forRoot() to imports array
```

- [ ] **Typecheck API**

```bash
cd apps/api && pnpm typecheck 2>&1 | tail -10
```
Expected: no errors

- [ ] **Commit**

```bash
git add apps/api/src/modules/email/email.service.ts apps/api/src/app.module.ts
git commit -m "feat(api): add error alert + spike alert email methods, register ErrorReportsModule"
```

---

### Task 4: Frontend errorReporter service

**Files:**
- Create: `apps/web/src/shared/services/errorReporter.ts`
- Create: `apps/web/src/shared/services/errorReporter.test.ts`

- [ ] **Write the failing tests**

```ts
// apps/web/src/shared/services/errorReporter.test.ts
import { reportError, _resetDedup } from "./errorReporter";

const fetchMock = vi.fn().mockResolvedValue({ ok: true });
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  fetchMock.mockClear();
  _resetDedup();
});

describe("reportError", () => {
  it("calls POST /api/error-reports with correct payload", async () => {
    reportError({ response: { status: 500 } }, { path: "/api/test", url: "http://app/test" });
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/error-reports"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"errorType":"5xx"'),
      }),
    );
  });

  it("deduplicates same (errorType, path) within 60s", async () => {
    reportError({ response: { status: 500 } }, { path: "/api/test", url: "http://app/test" });
    reportError({ response: { status: 500 } }, { path: "/api/test", url: "http://app/test" });
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("allows same path with different error type", async () => {
    reportError({ response: { status: 500 } }, { path: "/api/test", url: "http://app/test" });
    reportError({ response: { status: 403 } }, { path: "/api/test", url: "http://app/test" });
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("swallows fetch failure silently", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network"));
    expect(() =>
      reportError({ response: { status: 500 } }, { path: "/api/test", url: "http://app/test" }),
    ).not.toThrow();
  });
});
```

- [ ] **Run tests to confirm they fail**

```bash
cd apps/web && pnpm test --reporter=verbose 2>&1 | grep -E "errorReporter"
```
Expected: FAIL — module not found

- [ ] **Create errorReporter.ts**

```ts
// apps/web/src/shared/services/errorReporter.ts
import { getErrorStatus } from "@/shared/utils/queryErrorContent";
import { API_BASE_URL } from "@/shared/api/httpClient";

const recentlyReported = new Set<string>();

export const _resetDedup = () => recentlyReported.clear();

export const reportError = (
  error: unknown,
  context: { path: string; url: string },
): void => {
  // getErrorStatus returns 403/404 as numbers; stringify for the API
  const errorType = String(getErrorStatus(error)) as "5xx" | "network" | "403" | "404";
  const httpStatus = (error as { response?: { status?: number } })?.response?.status ?? null;
  const dedupKey = `${errorType}:${context.path}`;

  if (recentlyReported.has(dedupKey)) return;
  recentlyReported.add(dedupKey);
  setTimeout(() => recentlyReported.delete(dedupKey), 60_000);

  fetch(`${API_BASE_URL}/error-reports`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      errorType,
      httpStatus,
      path: context.path,
      url: context.url,
      userAgent: navigator.userAgent,
    }),
  }).catch(() => {
    // fire-and-forget — never surfaces to the user
  });
};
```

- [ ] **Run tests to confirm they pass**

```bash
cd apps/web && pnpm test --reporter=verbose 2>&1 | grep -E "errorReporter"
```
Expected: 4 tests PASS

- [ ] **Commit**

```bash
git add apps/web/src/shared/services/errorReporter.ts \
        apps/web/src/shared/services/errorReporter.test.ts
git commit -m "feat(web): add errorReporter service with dedup"
```

---

### Task 5: Integrate reportError into QueryErrorBoundary + DiagramGrid

**Files:**
- Modify: `apps/web/src/shared/components/QueryErrorBoundary.tsx`
- Modify: `apps/web/src/features/dashboard/components/DiagramGrid.tsx`

- [ ] **Add componentDidCatch to QueryErrorBoundaryClass**

In `apps/web/src/shared/components/QueryErrorBoundary.tsx`, add this import at the top:

```ts
import { reportError } from "@/shared/services/errorReporter";
```

Add `componentDidCatch` to the `QueryErrorBoundaryClass` class (after `getDerivedStateFromError`):

```ts
  componentDidCatch(error: unknown): void {
    const path = (error as { config?: { url?: string } })?.config?.url ?? window.location.pathname;
    reportError(error, { path, url: window.location.href });
  }
```

- [ ] **Add useEffect to DiagramGrid for isError reporting**

In `apps/web/src/features/dashboard/components/DiagramGrid.tsx`, add this import:

```ts
import { useEffect } from "react";
import { reportError } from "@/shared/services/errorReporter";
```

Add this `useEffect` after the `errorStatus` / `isPermissionError` lines:

```ts
  useEffect(() => {
    if (isError && error) {
      const path = (error as { config?: { url?: string } })?.config?.url ?? `/api/diagrams/${projectId}`;
      reportError(error, { path, url: window.location.href });
    }
  }, [isError, error, projectId]);
```

- [ ] **Run full frontend test suite**

```bash
cd apps/web && pnpm test 2>&1 | tail -10
```
Expected: all tests pass

- [ ] **Commit**

```bash
git add apps/web/src/shared/components/QueryErrorBoundary.tsx \
        apps/web/src/features/dashboard/components/DiagramGrid.tsx
git commit -m "feat(web): integrate errorReporter into QueryErrorBoundary and DiagramGrid"
```

---

### Task 6: Admin API client

**Files:**
- Create: `apps/web/src/shared/api/errorReports.api.ts`

- [ ] **Create the API client**

```ts
// apps/web/src/shared/api/errorReports.api.ts
import { httpClient } from "./httpClient";

// Mirror of backend ErrorType — defined locally to avoid @erdify/db frontend dependency
export type ApiErrorType = "5xx" | "network" | "403" | "404";

export interface GroupedErrorReport {
  errorType: ApiErrorType;
  path: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  resolved: boolean;
}

export interface ErrorReportStats {
  "5xx": number;
  network: number;
  "403": number;
  "404": number;
}

export interface ErrorReportsResponse {
  groups: GroupedErrorReport[];
  stats: ErrorReportStats;
}

export const getErrorReports = async (params: {
  type?: ApiErrorType;
  resolved?: boolean;
  from?: string;
}): Promise<ErrorReportsResponse> => {
  const query = new URLSearchParams();
  if (params.type) query.set("type", params.type);
  if (params.resolved !== undefined) query.set("resolved", String(params.resolved));
  if (params.from) query.set("from", params.from);
  const { data } = await httpClient.get<ErrorReportsResponse>(`/error-reports?${query}`);
  return data;
};

export const resolveErrorReport = async (params: {
  path: string;
  errorType: ApiErrorType;
  note?: string;
}): Promise<void> => {
  await httpClient.patch("/error-reports/resolve", params);
};
```

- [ ] **Typecheck**

```bash
cd apps/web && pnpm typecheck 2>&1 | grep -E "errorReports"
```
Expected: no errors

- [ ] **Commit**

```bash
git add apps/web/src/shared/api/errorReports.api.ts
git commit -m "feat(web): add errorReports API client"
```

---

### Task 7: Admin UI — ErrorReportsPage + SlideOver + CSS

**Files:**
- Create: `apps/web/src/features/admin/admin.css.ts`
- Create: `apps/web/src/features/admin/components/ErrorReportSlideOver.tsx`
- Create: `apps/web/src/features/admin/pages/ErrorReportsPage.tsx`

- [ ] **Create admin.css.ts**

```ts
// apps/web/src/features/admin/admin.css.ts
import { style, styleVariants } from "@vanilla-extract/css";
import { vars } from "@/style/tokens.css";

export const page = style({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  overflow: "hidden",
  background: vars.color.surfaceTertiary,
});

export const header = style({
  padding: `${vars.space["5"]} ${vars.space["6"]} ${vars.space["4"]}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  background: vars.color.surface,
  borderBottom: `1px solid ${vars.color.border}`,
  flexShrink: 0,
});

export const pageTitle = style({
  fontSize: "16px",
  fontWeight: "700",
  color: vars.color.textPrimary,
});

export const statsRow = style({
  display: "flex",
  gap: vars.space["2"],
});

export const statChip = style({
  padding: `3px ${vars.space["3"]}`,
  borderRadius: vars.radius.pill,
  fontSize: "12px",
  border: `1px solid ${vars.color.border}`,
  color: vars.color.textSecondary,
});

export const statChipCritical = style([statChip, {
  borderColor: "#3a2020",
  color: "#e05252",
  background: "#2a1a1a",
}]);

export const tabRow = style({
  display: "flex",
  gap: vars.space["3"],
  padding: `${vars.space["3"]} ${vars.space["6"]}`,
  background: vars.color.surface,
  borderBottom: `1px solid ${vars.color.border}`,
  alignItems: "center",
  flexShrink: 0,
});

export const tab = style({
  padding: `3px ${vars.space["3"]}`,
  borderRadius: vars.radius.pill,
  fontSize: "12px",
  cursor: "pointer",
  border: "none",
  fontFamily: vars.font.family,
  background: vars.color.surfaceSecondary,
  color: vars.color.textSecondary,
});

export const tabActive = style([tab, {
  background: vars.color.textPrimary,
  color: "#fff",
}]);

export const list = style({
  flex: 1,
  overflowY: "auto",
  padding: vars.space["5"],
  display: "flex",
  flexDirection: "column",
  gap: vars.space["2"],
});

export const errorRow = style({
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  padding: `${vars.space["3"]} ${vars.space["4"]}`,
  display: "flex",
  alignItems: "center",
  gap: vars.space["3"],
  cursor: "pointer",
  selectors: {
    "&:hover": { background: vars.color.surfaceSecondary },
  },
});

export const errorRowBorderVariants = styleVariants({
  "5xx":    { borderLeftWidth: "3px", borderLeftColor: "#e05252" },
  network:  { borderLeftWidth: "3px", borderLeftColor: "#e8a838" },
  "403":    { borderLeftWidth: "3px", borderLeftColor: "#4a4a7a" },
  "404":    { borderLeftWidth: "3px", borderLeftColor: "#3a3a5a" },
});

export const typeBadge = style({
  padding: `2px ${vars.space["2"]}`,
  borderRadius: vars.radius.sm,
  fontSize: "11px",
  fontWeight: "700",
  flexShrink: 0,
});

export const typeBadgeVariants = styleVariants({
  "5xx":   { background: "#2a1a1a", color: "#e05252" },
  network: { background: "#2a1814", color: "#e8a838" },
  "403":   { background: "#1e1e2e", color: "#8888cc" },
  "404":   { background: "#1e1e2e", color: "#6666aa" },
});

export const rowMeta = style({ flex: 1, minWidth: 0 });

export const rowPath = style({
  fontSize: "13px",
  color: vars.color.textPrimary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const rowTime = style({
  fontSize: "11px",
  color: vars.color.textSecondary,
  marginTop: "2px",
});

export const countBadge = style({
  padding: `1px ${vars.space["2"]}`,
  borderRadius: vars.radius.pill,
  fontSize: "11px",
  fontWeight: "700",
  background: "#e05252",
  color: "#fff",
  flexShrink: 0,
});

export const countBadgeMuted = style([countBadge, {
  background: vars.color.surfaceSecondary,
  color: vars.color.textSecondary,
}]);

export const resolveBtn = style({
  padding: `3px ${vars.space["3"]}`,
  borderRadius: vars.radius.sm,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.surface,
  color: vars.color.textSecondary,
  fontSize: "11px",
  cursor: "pointer",
  flexShrink: 0,
  selectors: {
    "&:hover": { background: vars.color.surfaceSecondary },
  },
});

export const spikeBanner = style({
  background: "#1a1400",
  border: `1px solid #3a2800`,
  borderRadius: vars.radius.md,
  padding: `${vars.space["2"]} ${vars.space["4"]}`,
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  fontSize: "12px",
  color: "#e8a838",
  marginBottom: vars.space["2"],
});

// Slide-over
export const slideOverBackdrop = style({
  position: "fixed",
  inset: 0,
  zIndex: 50,
  display: "flex",
  justifyContent: "flex-end",
});

export const slideOver = style({
  width: "400px",
  background: vars.color.surface,
  borderLeft: `1px solid ${vars.color.border}`,
  display: "flex",
  flexDirection: "column",
  boxShadow: "-4px 0 16px rgba(0,0,0,0.3)",
});

export const slideOverHeader = style({
  padding: `${vars.space["4"]} ${vars.space["5"]}`,
  borderBottom: `1px solid ${vars.color.border}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
});

export const slideOverTitle = style({
  fontSize: "14px",
  fontWeight: "700",
  color: vars.color.textPrimary,
});

export const slideOverClose = style({
  background: "none",
  border: "none",
  color: vars.color.textSecondary,
  fontSize: "18px",
  cursor: "pointer",
  padding: 0,
});

export const slideOverBody = style({
  flex: 1,
  overflowY: "auto",
  padding: vars.space["5"],
});

export const detailGrid = style({
  background: vars.color.surfaceSecondary,
  borderRadius: vars.radius.md,
  padding: vars.space["4"],
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  gap: `${vars.space["2"]} ${vars.space["3"]}`,
  fontSize: "12px",
  marginBottom: vars.space["4"],
});

export const detailLabel = style({ color: vars.color.textSecondary });
export const detailValue = style({ color: vars.color.textPrimary });

export const noteLabel = style({
  fontSize: "12px",
  color: vars.color.textSecondary,
  marginBottom: vars.space["2"],
});

export const noteTextarea = style({
  width: "100%",
  minHeight: "80px",
  background: vars.color.surfaceSecondary,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  padding: vars.space["3"],
  color: vars.color.textPrimary,
  fontSize: "12px",
  fontFamily: vars.font.family,
  resize: "vertical",
  boxSizing: "border-box",
});

export const slideOverFooter = style({
  padding: vars.space["4"],
  borderTop: `1px solid ${vars.color.border}`,
});

export const resolveConfirmBtn = style({
  width: "100%",
  padding: vars.space["3"],
  background: vars.color.brand,
  color: "#fff",
  border: "none",
  borderRadius: vars.radius.md,
  fontSize: "13px",
  fontWeight: "700",
  cursor: "pointer",
  selectors: {
    "&:hover": { opacity: 0.9 },
  },
});

export const resolveHint = style({
  fontSize: "11px",
  color: vars.color.textSecondary,
  textAlign: "center",
  marginTop: vars.space["2"],
});
```

- [ ] **Create ErrorReportSlideOver.tsx**

```tsx
// apps/web/src/features/admin/components/ErrorReportSlideOver.tsx
import { useState } from "react";
import type { GroupedErrorReport } from "@/shared/api/errorReports.api";
import * as css from "../admin.css";

interface Props {
  report: GroupedErrorReport;
  onClose: () => void;
  onResolved: (path: string, errorType: GroupedErrorReport["errorType"], note: string) => void;
}

export const ErrorReportSlideOver = ({ report, onClose, onResolved }: Props) => {
  const [note, setNote] = useState("");

  return (
    <div className={css.slideOverBackdrop} onClick={onClose}>
      <div className={css.slideOver} onClick={(e) => e.stopPropagation()}>
        <div className={css.slideOverHeader}>
          <div className={css.slideOverTitle}>에러 상세</div>
          <button type="button" className={css.slideOverClose} onClick={onClose}>✕</button>
        </div>

        <div className={css.slideOverBody}>
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap", alignItems: "center" }}>
            <span className={`${css.typeBadge} ${css.typeBadgeVariants[report.errorType]}`}>
              {report.errorType}{report.errorType === "5xx" ? "" : ""}
            </span>
            <span style={{ fontSize: "12px", color: "var(--color-text-secondary, #aaa)", wordBreak: "break-all" }}>
              {report.path}
            </span>
          </div>

          <div className={css.detailGrid}>
            <span className={css.detailLabel}>발생 횟수</span>
            <span className={css.detailValue}>{report.count}회</span>
            <span className={css.detailLabel}>첫 발생</span>
            <span className={css.detailValue}>{new Date(report.firstSeen).toLocaleString("ko-KR")}</span>
            <span className={css.detailLabel}>최근 발생</span>
            <span className={css.detailValue}>{new Date(report.lastSeen).toLocaleString("ko-KR")}</span>
          </div>

          <div className={css.noteLabel}>해결 메모 (선택)</div>
          <textarea
            className={css.noteTextarea}
            placeholder="원인 파악 후 메모..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className={css.slideOverFooter}>
          <button
            type="button"
            className={css.resolveConfirmBtn}
            onClick={() => onResolved(report.path, report.errorType, note)}
          >
            ✓ 해결 완료로 표시
          </button>
          <div className={css.resolveHint}>해결자 및 시각이 자동 기록됩니다</div>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Create ErrorReportsPage.tsx**

```tsx
// apps/web/src/features/admin/pages/ErrorReportsPage.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getErrorReports, resolveErrorReport } from "@/shared/api/errorReports.api";
import type { GroupedErrorReport } from "@/shared/api/errorReports.api";
import { ErrorReportSlideOver } from "../components/ErrorReportSlideOver";
import * as css from "../admin.css";

type Tab = "unresolved" | "resolved";
type ErrorType = GroupedErrorReport["errorType"];

export const ErrorReportsPage = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("unresolved");
  const [typeFilter, setTypeFilter] = useState<ErrorType | undefined>(undefined);
  const [selected, setSelected] = useState<GroupedErrorReport | null>(null);

  const { data } = useQuery({
    queryKey: ["admin", "error-reports", tab, typeFilter],
    queryFn: () => getErrorReports({ resolved: tab === "resolved", type: typeFilter }),
  });

  const resolve = useMutation({
    mutationFn: resolveErrorReport,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "error-reports"] });
      setSelected(null);
    },
  });

  const groups = data?.groups ?? [];
  const stats = data?.stats;

  const unresolvedCount = groups.filter((g) => !g.resolved).length;

  return (
    <div className={css.page}>
      <div className={css.header}>
        <div className={css.pageTitle}>에러 리포트</div>
        {stats && (
          <div className={css.statsRow}>
            <span className={css.statChipCritical}>5xx: {stats["5xx"]}</span>
            <span className={css.statChipCritical}>net: {stats.network}</span>
            <span className={css.statChip}>403: {stats["403"]}</span>
            <span className={css.statChip}>404: {stats["404"]}</span>
          </div>
        )}
      </div>

      <div className={css.tabRow}>
        <button
          type="button"
          className={tab === "unresolved" ? css.tabActive : css.tab}
          onClick={() => setTab("unresolved")}
        >
          미해결 ({unresolvedCount})
        </button>
        <button
          type="button"
          className={tab === "resolved" ? css.tabActive : css.tab}
          onClick={() => setTab("resolved")}
        >
          해결됨
        </button>
        <div style={{ flex: 1 }} />
        {(["5xx", "network", "403", "404"] as ErrorType[]).map((t) => (
          <button
            key={t}
            type="button"
            className={typeFilter === t ? css.tabActive : css.tab}
            onClick={() => setTypeFilter(typeFilter === t ? undefined : t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className={css.list}>
        {groups.map((report) => (
          <div
            key={`${report.errorType}:${report.path}`}
            className={`${css.errorRow} ${css.errorRowBorderVariants[report.errorType]}`}
            onClick={() => setSelected(report)}
          >
            <span className={`${css.typeBadge} ${css.typeBadgeVariants[report.errorType]}`}>
              {report.errorType}
            </span>
            <div className={css.rowMeta}>
              <div className={css.rowPath}>{report.path}</div>
              <div className={css.rowTime}>
                첫 발생: {new Date(report.firstSeen).toLocaleString("ko-KR")} ·
                최근: {new Date(report.lastSeen).toLocaleString("ko-KR")}
              </div>
            </div>
            <span className={report.count > 1 ? css.countBadge : css.countBadgeMuted}>
              ×{report.count}
            </span>
            <button
              type="button"
              className={css.resolveBtn}
              onClick={(e) => {
                e.stopPropagation();
                setSelected(report);
              }}
            >
              해결 →
            </button>
          </div>
        ))}
      </div>

      {selected && (
        <ErrorReportSlideOver
          report={selected}
          onClose={() => setSelected(null)}
          onResolved={(path, errorType, note) =>
            resolve.mutate({ path, errorType, note: note || undefined })
          }
        />
      )}
    </div>
  );
};
```

- [ ] **Typecheck**

```bash
cd apps/web && pnpm typecheck 2>&1 | grep -E "admin"
```
Expected: no errors

- [ ] **Commit**

```bash
git add apps/web/src/features/admin/
git commit -m "feat(web): add ErrorReportsPage, ErrorReportSlideOver, and admin styles"
```

---

### Task 8: Sidebar admin section + Router

**Files:**
- Modify: `apps/web/src/features/dashboard/components/UnifiedSidebar/SidebarBottomBar.tsx`
- Modify: `apps/web/src/router/index.tsx`

- [ ] **Update SidebarBottomBar.tsx**

Replace the full content of `SidebarBottomBar.tsx`:

```tsx
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/shared/api/auth.api";
import * as css from "./unified-sidebar.css";

interface SidebarBottomBarProps {
  orgId: string | undefined;
  apiKeysActive: boolean;
}

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS ?? "").split(",").map((e: string) => e.trim()).filter(Boolean);

export const SidebarBottomBar = ({ orgId, apiKeysActive }: SidebarBottomBarProps) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });

  const isAdmin = !!me?.email && ADMIN_EMAILS.includes(me.email);
  const errorReportsActive = pathname === "/admin/error-reports";

  return (
    <div className={css.sidebarBottomBar}>
      <button
        className={[css.projRow, apiKeysActive ? css.projRowActive : ""].filter(Boolean).join(" ")}
        onClick={() => { if (orgId) navigate(`/${orgId}/api-keys`); }}
        aria-pressed={apiKeysActive}
      >
        <span className={css.projArrow} aria-hidden="true" />
        <span className={css.projIcon} aria-hidden="true">🔑</span>
        <span className={css.projName}>API 키</span>
      </button>
      {isAdmin && (
        <button
          className={[css.projRow, errorReportsActive ? css.projRowActive : ""].filter(Boolean).join(" ")}
          onClick={() => navigate("/admin/error-reports")}
          aria-pressed={errorReportsActive}
        >
          <span className={css.projArrow} aria-hidden="true" />
          <span className={css.projIcon} aria-hidden="true">🚨</span>
          <span className={css.projName}>에러 리포트</span>
        </button>
      )}
    </div>
  );
};
```

- [ ] **Update Router.tsx**

Add the lazy import at the top with other lazy imports:

```tsx
const ErrorReportsPage = lazy(() => import("@/features/admin/pages/ErrorReportsPage").then(m => ({ default: m.ErrorReportsPage })));
```

Inside `<Route element={<ProtectedRoute />}>`, after the DashboardPage route block, add:

```tsx
        <Route
          path="/admin/error-reports"
          element={
            <QueryErrorBoundary variant="page" backLabel="대시보드로 이동" backPath="/">
              <DashboardPage />
            </QueryErrorBoundary>
          }
        >
          <Route index element={<ErrorReportsPage />} />
        </Route>
```

Note: Wrapping with `DashboardPage` keeps the sidebar + topbar visible for the admin page.

- [ ] **Run full test suite and typecheck**

```bash
cd apps/web && pnpm typecheck && pnpm test 2>&1 | tail -15
```
Expected: all tests pass, no type errors

- [ ] **Commit**

```bash
git add apps/web/src/features/dashboard/components/UnifiedSidebar/SidebarBottomBar.tsx \
        apps/web/src/router/index.tsx
git commit -m "feat(web): admin error reports sidebar link and route"
```
