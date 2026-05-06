# MCP AI 활동 감사 로그 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** MCP 툴이 다이어그램을 수정할 때 세션 단위로 기록하고, 에디터에서 실시간 확인·되돌리기를 제공한다.

**Architecture:** `X-MCP-Session-ID` 헤더로 MCP tool calls를 세션 단위로 그룹핑. API가 `mcp_sessions` 테이블에 저장하고 첫 tool call 시 스냅샷을 `diagram_versions`에 저장. WebSocket `mcp_activity` 이벤트로 실시간 알림. 프론트엔드는 McpActivityDrawer + 토스트로 표시.

**Tech Stack:** TypeORM (NestJS), PostgreSQL, socket.io, TanStack Query, vanilla-extract, React (const 화살표 함수, useEffect 최소화)

---

## File Map

| 파일 | 유형 |
|------|------|
| `packages/db/src/entities/mcp-session.entity.ts` | 신규 |
| `packages/db/src/migrations/1746000000010-CreateMcpSessionsTable.ts` | 신규 |
| `packages/db/src/index.ts` | 수정 |
| `apps/api/src/modules/diagrams/mcp-sessions.service.ts` | 신규 |
| `apps/api/src/modules/diagrams/mcp-sessions.controller.ts` | 신규 |
| `apps/api/src/modules/diagrams/diagrams.module.ts` | 수정 |
| `apps/api/src/modules/collaboration/collaboration.gateway.ts` | 수정 |
| `apps/mcp-server/src/index.ts` | 수정 |
| `apps/mcp-server/src/client.ts` | 수정 |
| `apps/mcp-server/src/tools/write-tools.ts` | 수정 |
| `apps/web/src/shared/api/mcp-sessions.api.ts` | 신규 |
| `apps/web/src/features/editor/hooks/useMcpActivity.ts` | 신규 |
| `apps/web/src/features/editor/components/McpActivityDrawer.tsx` | 신규 |
| `apps/web/src/features/editor/components/mcp-activity-drawer.css.ts` | 신규 |
| `apps/web/src/features/editor/pages/EditorPage.tsx` | 수정 |

---

## Task 1: DB 엔티티 + 마이그레이션

**Files:**
- Create: `packages/db/src/entities/mcp-session.entity.ts`
- Create: `packages/db/src/migrations/1746000000010-CreateMcpSessionsTable.ts`
- Modify: `packages/db/src/index.ts`

- [ ] **Step 1: 엔티티 파일 작성**

`packages/db/src/entities/mcp-session.entity.ts`:
```typescript
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from "typeorm";
import type { Diagram } from "./diagram.entity";

@Entity("mcp_sessions")
export class McpSession {
  @PrimaryColumn("varchar", { length: 36 })
  id!: string;

  @Column({ name: "diagram_id", length: 36 })
  diagramId!: string;

  @Column({ type: "jsonb", default: [] })
  tool_calls!: { tool: string; summary: string }[];

  @Column({ type: "varchar", length: 500, nullable: true })
  summary!: string | null;

  @Column({ name: "snapshot_version_id", length: 36, nullable: true })
  snapshotVersionId!: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @ManyToOne("Diagram", "mcpSessions")
  @JoinColumn({ name: "diagram_id" })
  diagram!: Diagram;
}
```

- [ ] **Step 2: 마이그레이션 파일 작성**

`packages/db/src/migrations/1746000000010-CreateMcpSessionsTable.ts`:
```typescript
import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMcpSessionsTable1746000000010 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "mcp_sessions" (
        "id"                   VARCHAR(36)  NOT NULL,
        "diagram_id"           VARCHAR(36)  NOT NULL,
        "tool_calls"           JSONB        NOT NULL DEFAULT '[]',
        "summary"              VARCHAR(500),
        "snapshot_version_id"  VARCHAR(36),
        "created_at"           TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"           TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "pk_mcp_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "fk_mcp_sessions_diagram"
          FOREIGN KEY ("diagram_id") REFERENCES "diagrams"("id") ON DELETE CASCADE
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "mcp_sessions"`);
  }
}
```

- [ ] **Step 3: `packages/db/src/index.ts`에 export 추가**

기존 export 목록에 추가:
```typescript
export { McpSession } from "./entities/mcp-session.entity";
```
기존 migration export 목록에 추가:
```typescript
export { CreateMcpSessionsTable1746000000010 } from "./migrations/1746000000010-CreateMcpSessionsTable";
```

- [ ] **Step 4: 빌드 확인**

```bash
pnpm --filter @erdify/db build
```
Expected: 에러 없이 완료.

- [ ] **Step 5: 커밋**

```bash
git add packages/db/src/entities/mcp-session.entity.ts \
        packages/db/src/migrations/1746000000010-CreateMcpSessionsTable.ts \
        packages/db/src/index.ts
git commit -m "feat(db): add McpSession entity and migration"
```

---

## Task 2: McpSessionsService

**Files:**
- Create: `apps/api/src/modules/diagrams/mcp-sessions.service.ts`

- [ ] **Step 1: 서비스 작성**

`apps/api/src/modules/diagrams/mcp-sessions.service.ts`:
```typescript
import { randomUUID } from "crypto";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Diagram, DiagramVersion, McpSession } from "@erdify/db";
import type { Repository } from "typeorm";

export interface ToolCallEntry {
  tool: string;
  summary: string;
}

export interface McpSessionResponse {
  id: string;
  summary: string | null;
  toolCalls: ToolCallEntry[];
  snapshotVersionId: string | null;
  createdAt: string;
  updatedAt: string;
}

function buildSummary(toolCalls: ToolCallEntry[]): string {
  const full = toolCalls.map((t) => t.summary).join(", ");
  return full.length > 200 ? full.slice(0, 199) + "…" : full;
}

@Injectable()
export class McpSessionsService {
  constructor(
    @InjectRepository(McpSession)
    private readonly sessionRepo: Repository<McpSession>,
    @InjectRepository(Diagram)
    private readonly diagramRepo: Repository<Diagram>,
    @InjectRepository(DiagramVersion)
    private readonly versionRepo: Repository<DiagramVersion>
  ) {}

  async recordToolCall(
    diagramId: string,
    sessionId: string,
    entry: ToolCallEntry
  ): Promise<McpSession> {
    let session = await this.sessionRepo.findOne({ where: { id: sessionId, diagramId } });

    if (!session) {
      // 첫 tool call: 현재 다이어그램 상태를 스냅샷으로 저장
      const diagram = await this.diagramRepo.findOne({ where: { id: diagramId } });
      if (!diagram) throw new NotFoundException("Diagram not found");

      const last = await this.versionRepo.findOne({
        where: { diagramId },
        order: { revision: "DESC" },
      });
      const revision = (last?.revision ?? 0) + 1;
      const version = await this.versionRepo.save(
        this.versionRepo.create({
          id: randomUUID(),
          diagramId,
          content: diagram.content,
          revision,
          createdBy: "mcp",
        })
      );

      session = this.sessionRepo.create({
        id: sessionId,
        diagramId,
        tool_calls: [entry],
        summary: entry.summary,
        snapshotVersionId: version.id,
      });
    } else {
      const toolCalls = [...session.tool_calls, entry];
      session.tool_calls = toolCalls;
      session.summary = buildSummary(toolCalls);
    }

    return this.sessionRepo.save(session);
  }

  async listSessions(diagramId: string): Promise<McpSessionResponse[]> {
    const sessions = await this.sessionRepo.find({
      where: { diagramId },
      order: { createdAt: "DESC" },
      take: 50,
    });
    return sessions.map((s) => ({
      id: s.id,
      summary: s.summary,
      toolCalls: s.tool_calls,
      snapshotVersionId: s.snapshotVersionId,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));
  }

  async revertSession(diagramId: string, sessionId: string): Promise<void> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId, diagramId } });
    if (!session) throw new NotFoundException("Session not found");
    if (!session.snapshotVersionId) throw new NotFoundException("No snapshot for this session");

    const version = await this.versionRepo.findOne({
      where: { id: session.snapshotVersionId, diagramId },
    });
    if (!version) throw new NotFoundException("Snapshot version not found");

    const diagram = await this.diagramRepo.findOne({ where: { id: diagramId } });
    if (!diagram) throw new NotFoundException("Diagram not found");

    diagram.content = version.content;
    await this.diagramRepo.save(diagram);
  }
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/api/src/modules/diagrams/mcp-sessions.service.ts
git commit -m "feat(api): add McpSessionsService (recordToolCall, listSessions, revertSession)"
```

---

## Task 3: McpSessionsController + DiagramsModule 등록

**Files:**
- Create: `apps/api/src/modules/diagrams/mcp-sessions.controller.ts`
- Modify: `apps/api/src/modules/diagrams/diagrams.module.ts`

- [ ] **Step 1: 컨트롤러 작성**

`apps/api/src/modules/diagrams/mcp-sessions.controller.ts`:
```typescript
import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from "@nestjs/common";
import { FlexAuthGuard } from "../auth/guards/flex-auth.guard";
import { CollaborationGateway } from "../collaboration/collaboration.gateway";
import { McpSessionsService } from "./mcp-sessions.service";

class RecordToolCallDto {
  tool!: string;
  summary!: string;
}

@Controller("diagrams/:diagramId/mcp-sessions")
@UseGuards(FlexAuthGuard)
export class McpSessionsController {
  constructor(
    private readonly mcpSessionsService: McpSessionsService,
    private readonly collaborationGateway: CollaborationGateway
  ) {}

  @Post(":sessionId/tool-calls")
  @HttpCode(200)
  async recordToolCall(
    @Param("diagramId") diagramId: string,
    @Param("sessionId") sessionId: string,
    @Body() dto: RecordToolCallDto
  ) {
    const session = await this.mcpSessionsService.recordToolCall(diagramId, sessionId, {
      tool: dto.tool,
      summary: dto.summary,
    });

    this.collaborationGateway.broadcastMcpActivity(diagramId, {
      sessionId,
      summary: session.summary ?? dto.summary,
      toolCall: { tool: dto.tool, summary: dto.summary },
    });

    return { ok: true };
  }

  @Get()
  async listSessions(@Param("diagramId") diagramId: string) {
    return this.mcpSessionsService.listSessions(diagramId);
  }

  @Post(":sessionId/revert")
  @HttpCode(200)
  async revertSession(
    @Param("diagramId") diagramId: string,
    @Param("sessionId") sessionId: string
  ) {
    await this.mcpSessionsService.revertSession(diagramId, sessionId);
    return { ok: true };
  }
}
```

- [ ] **Step 2: DiagramsModule 수정**

`apps/api/src/modules/diagrams/diagrams.module.ts` 전체를 아래로 교체:
```typescript
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Diagram, DiagramVersion, McpSession, OrganizationMember, Project } from "@erdify/db";
import { AuthModule } from "../auth/auth.module";
import { CollaborationModule } from "../collaboration/collaboration.module";
import { PublicDiagramsController } from "./public-diagrams.controller";
import { DiagramsController } from "./diagrams.controller";
import { DiagramsService } from "./diagrams.service";
import { McpSessionsController } from "./mcp-sessions.controller";
import { McpSessionsService } from "./mcp-sessions.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Diagram, DiagramVersion, McpSession, Project, OrganizationMember]),
    AuthModule,
    CollaborationModule,
  ],
  controllers: [
    PublicDiagramsController,
    DiagramsController,
    McpSessionsController,
  ],
  providers: [DiagramsService, McpSessionsService],
  exports: [DiagramsService],
})
export class DiagramsModule {}
```

> **주의:** `CollaborationModule`이 `CollaborationGateway`를 export하는지 확인 필요. 만약 export 안 한다면 `collaboration.module.ts`에 `exports: [CollaborationGateway]` 추가.

- [ ] **Step 3: collaboration.module.ts에 export 확인 및 추가**

`apps/api/src/modules/collaboration/collaboration.module.ts` 파일을 읽어 `CollaborationGateway`가 exports에 있는지 확인. 없으면 추가:
```typescript
exports: [CollaborationGateway]
```

- [ ] **Step 4: 커밋**

```bash
git add apps/api/src/modules/diagrams/mcp-sessions.controller.ts \
        apps/api/src/modules/diagrams/diagrams.module.ts
git commit -m "feat(api): add McpSessionsController and register in DiagramsModule"
```

---

## Task 4: WebSocket `mcp_activity` 이벤트 추가

**Files:**
- Modify: `apps/api/src/modules/collaboration/collaboration.gateway.ts`

- [ ] **Step 1: `broadcastMcpActivity` 메서드 추가**

`collaboration.gateway.ts`에서 클래스 안에 다음 메서드 추가:
```typescript
broadcastMcpActivity(
  diagramId: string,
  data: { sessionId: string; summary: string; toolCall: { tool: string; summary: string } }
): void {
  this.server.to(diagramId).emit("mcp_activity", {
    type: "mcp_activity",
    diagramId,
    ...data,
  });
}
```

- [ ] **Step 2: 타입스크립트 체크**

```bash
pnpm --filter @erdify/api typecheck
```
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add apps/api/src/modules/collaboration/collaboration.gateway.ts
git commit -m "feat(api): add broadcastMcpActivity to CollaborationGateway"
```

---

## Task 5: MCP 서버 — 세션 ID + recordToolCall

**Files:**
- Modify: `apps/mcp-server/src/index.ts`
- Modify: `apps/mcp-server/src/client.ts`
- Modify: `apps/mcp-server/src/tools/write-tools.ts`

- [ ] **Step 1: `index.ts`에 세션 ID 생성**

`apps/mcp-server/src/index.ts` 상단에 추가 (기존 import 아래):
```typescript
import { randomUUID } from "node:crypto";

export const MCP_SESSION_ID = randomUUID();
```

- [ ] **Step 2: `client.ts` 수정 — 헤더 + recordToolCall**

`apps/mcp-server/src/client.ts`의 `request` 함수 headers 부분을 수정하고, `recordToolCall` 추가:

`request` 함수 내 headers:
```typescript
headers: {
  "Content-Type": "application/json",
  Authorization: `Bearer ${API_KEY}`,
  "X-MCP-Session-ID": MCP_SESSION_ID,
},
```

단, `MCP_SESSION_ID`를 import해야 함:
```typescript
import { MCP_SESSION_ID } from "./index.js";
```

> **순환 참조 주의:** index.ts가 client.ts를 import하고 client.ts가 index.ts를 import하면 순환 참조 발생. 이를 피하려면 `MCP_SESSION_ID`를 별도 파일(`session.ts`)에 정의:

`apps/mcp-server/src/session.ts` (새 파일):
```typescript
import { randomUUID } from "node:crypto";
export const MCP_SESSION_ID = randomUUID();
```

`index.ts`에서:
```typescript
import { MCP_SESSION_ID } from "./session.js";
// MCP_SESSION_ID는 session.ts에서 관리
```

`client.ts`에서:
```typescript
import { MCP_SESSION_ID } from "./session.js";

// request 함수 headers에 추가:
"X-MCP-Session-ID": MCP_SESSION_ID,
```

`client`객체에 `recordToolCall` 추가:
```typescript
recordToolCall: (diagramId: string, tool: string, summary: string) =>
  request<void>("POST", `/diagrams/${diagramId}/mcp-sessions/${MCP_SESSION_ID}/tool-calls`, {
    tool,
    summary,
  }),
```

- [ ] **Step 3: `write-tools.ts` 수정 — 각 tool 후 recordToolCall 호출**

각 tool handler의 `await client.updateDiagram(...)` 이후에 `client.recordToolCall()` 호출 추가:

**add_table** (name 변수 사용):
```typescript
await client.updateDiagram(diagramId, updated);
await client.recordToolCall(diagramId, "add_table", `"${name}" 테이블 추가`).catch(() => {});
```

**remove_table** (entity.name 사용):
```typescript
await client.updateDiagram(diagramId, updated);
await client.recordToolCall(diagramId, "remove_table", `"${entity.name}" 테이블 삭제`).catch(() => {});
```

**add_column** (entity.name, column.name 사용):
```typescript
await client.updateDiagram(diagramId, updated);
await client.recordToolCall(diagramId, "add_column", `"${entity.name}.${column.name}" 컬럼 추가`).catch(() => {});
```

**update_column** (entity.name, col.name 사용):
```typescript
await client.updateDiagram(diagramId, updated);
await client.recordToolCall(diagramId, "update_column", `"${entity.name}.${col.name}" 컬럼 수정`).catch(() => {});
```

**remove_column** (entity.name, colToRemove.name 사용):
```typescript
await client.updateDiagram(diagramId, updated);
await client.recordToolCall(diagramId, "remove_column", `"${entity.name}.${colToRemove.name}" 컬럼 삭제`).catch(() => {});
```

**add_relationship** (srcName, tgtName 이미 존재):
```typescript
await client.updateDiagram(diagramId, updated);
await client.recordToolCall(diagramId, "add_relationship", `"${srcName}" → "${tgtName}" 관계 추가`).catch(() => {});
```

**remove_relationship** (srcName, tgtName 이미 존재):
```typescript
await client.updateDiagram(diagramId, updated);
await client.recordToolCall(diagramId, "remove_relationship", `"${srcName}" → "${tgtName}" 관계 삭제`).catch(() => {});
```

> `.catch(() => {})` — MCP 활동 로그 실패가 원래 tool 동작을 막으면 안 되므로 에러 무시.

- [ ] **Step 4: 타입스크립트 체크**

```bash
pnpm --filter @erdify/mcp-server typecheck
```
Expected: 에러 없음.

- [ ] **Step 5: 커밋**

```bash
git add apps/mcp-server/src/session.ts \
        apps/mcp-server/src/index.ts \
        apps/mcp-server/src/client.ts \
        apps/mcp-server/src/tools/write-tools.ts
git commit -m "feat(mcp-server): add session ID, X-MCP-Session-ID header, and recordToolCall"
```

---

## Task 6: 프론트엔드 API + Hook

**Files:**
- Create: `apps/web/src/shared/api/mcp-sessions.api.ts`
- Create: `apps/web/src/features/editor/hooks/useMcpActivity.ts`

- [ ] **Step 1: API 함수 작성**

`apps/web/src/shared/api/mcp-sessions.api.ts`:
```typescript
import { httpClient } from "./http-client";

export interface ToolCallEntry {
  tool: string;
  summary: string;
}

export interface McpSessionResponse {
  id: string;
  summary: string | null;
  toolCalls: ToolCallEntry[];
  snapshotVersionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export const listMcpSessions = (diagramId: string): Promise<McpSessionResponse[]> =>
  httpClient.get(`/diagrams/${diagramId}/mcp-sessions`);

export const revertMcpSession = (diagramId: string, sessionId: string): Promise<void> =>
  httpClient.post(`/diagrams/${diagramId}/mcp-sessions/${sessionId}/revert`, {});
```

> `httpClient`의 실제 import 경로는 기존 `diagrams.api.ts`의 import를 확인하여 맞춰야 함. 예: `import { httpClient } from "./http-client"`.

- [ ] **Step 2: httpClient import 경로 확인**

```bash
grep -n "^import" apps/web/src/shared/api/diagrams.api.ts | head -5
```
Expected: httpClient import 경로 확인 후 `mcp-sessions.api.ts`에 동일하게 적용.

- [ ] **Step 3: useMcpActivity Hook 작성**

`apps/web/src/features/editor/hooks/useMcpActivity.ts`:
```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listMcpSessions, revertMcpSession } from "../../../shared/api/mcp-sessions.api";
import type { McpSessionResponse } from "../../../shared/api/mcp-sessions.api";
import { useEditorStore } from "../stores/useEditorStore";

export interface UseMcpActivityResult {
  sessions: McpSessionResponse[];
  isLoading: boolean;
  revertSession: (sessionId: string) => void;
  isReverting: boolean;
}

export const useMcpActivity = (diagramId: string): UseMcpActivityResult => {
  const queryClient = useQueryClient();
  const setDocument = useEditorStore((s) => s.setDocument);

  const sessionsQuery = useQuery({
    queryKey: ["mcp-sessions", diagramId],
    queryFn: () => listMcpSessions(diagramId),
    enabled: !!diagramId,
  });

  const revertMutation = useMutation({
    mutationFn: (sessionId: string) => revertMcpSession(diagramId, sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diagram", diagramId] });
      queryClient.invalidateQueries({ queryKey: ["mcp-sessions", diagramId] });
    },
  });

  return {
    sessions: sessionsQuery.data ?? [],
    isLoading: sessionsQuery.isLoading,
    revertSession: revertMutation.mutate,
    isReverting: revertMutation.isPending,
  };
};
```

- [ ] **Step 4: 커밋**

```bash
git add apps/web/src/shared/api/mcp-sessions.api.ts \
        apps/web/src/features/editor/hooks/useMcpActivity.ts
git commit -m "feat(web): add mcp-sessions API and useMcpActivity hook"
```

---

## Task 7: McpActivityDrawer 컴포넌트

**Files:**
- Create: `apps/web/src/features/editor/components/McpActivityDrawer.tsx`
- Create: `apps/web/src/features/editor/components/mcp-activity-drawer.css.ts`

- [ ] **Step 1: CSS 작성**

`apps/web/src/features/editor/components/mcp-activity-drawer.css.ts`:
```typescript
import { style } from "@vanilla-extract/css";

export const drawer = style({
  width: "300px",
  height: "100%",
  background: "#fff",
  borderLeft: "1px solid #e5e7eb",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
});

export const drawerHeader = style({
  padding: "14px 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  borderBottom: "1px solid #e5e7eb",
  flexShrink: 0,
});

export const drawerTitleGroup = style({
  display: "flex",
  alignItems: "center",
  gap: "8px",
});

export const drawerTitle = style({
  fontSize: "14px",
  fontWeight: 700,
  color: "#111827",
  margin: 0,
});

export const newBadge = style({
  background: "#0064E0",
  color: "#fff",
  fontSize: "10px",
  fontWeight: 700,
  padding: "1px 7px",
  borderRadius: "99px",
});

export const closeBtn = style({
  background: "none",
  border: "none",
  color: "#9ca3af",
  fontSize: "18px",
  cursor: "pointer",
  lineHeight: 1,
  padding: 0,
});

export const drawerBody = style({
  flex: 1,
  overflowY: "auto",
});

export const sessionItem = style({
  padding: "14px 16px",
  borderBottom: "1px solid #e5e7eb",
});

export const sessionItemNew = style({
  padding: "14px 16px",
  borderBottom: "1px solid #e5e7eb",
  background: "#f8fbff",
});

export const sessionTimestamp = style({
  fontSize: "11px",
  color: "#9ca3af",
  marginBottom: "6px",
});

export const sessionTimestampNew = style({
  display: "flex",
  alignItems: "center",
  gap: "6px",
  marginBottom: "6px",
});

export const newDot = style({
  width: "7px",
  height: "7px",
  background: "#0064E0",
  borderRadius: "50%",
  flexShrink: 0,
});

export const newTimestampText = style({
  fontSize: "11px",
  color: "#0064E0",
  fontWeight: 600,
});

export const sessionSummary = style({
  fontSize: "13px",
  color: "#111827",
  fontWeight: 500,
  lineHeight: 1.5,
  marginBottom: "10px",
});

export const sessionSummaryOld = style({
  fontSize: "13px",
  color: "#374151",
  lineHeight: 1.5,
  marginBottom: "10px",
});

export const toolCallList = style({
  background: "#f1f4f7",
  borderRadius: "8px",
  padding: "8px 10px",
  marginBottom: "10px",
  fontSize: "11px",
  color: "#6b7280",
});

export const toolCallItem = style({
  marginBottom: "3px",
  selectors: {
    "&:last-child": { marginBottom: 0 },
  },
});

export const sessionActions = style({
  display: "flex",
  gap: "8px",
  alignItems: "center",
});

export const toggleBtn = style({
  fontSize: "11px",
  color: "#6b7280",
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 0,
});

export const spacer = style({ flex: 1 });

export const revertBtn = style({
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: "6px",
  padding: "5px 12px",
  fontSize: "12px",
  fontWeight: 500,
  color: "#374151",
  cursor: "pointer",
  selectors: {
    "&:disabled": { opacity: 0.5, cursor: "not-allowed" },
  },
});

export const emptyText = style({
  padding: "32px 16px",
  textAlign: "center",
  color: "#9ca3af",
  fontSize: "13px",
});
```

- [ ] **Step 2: McpActivityDrawer 컴포넌트 작성**

`apps/web/src/features/editor/components/McpActivityDrawer.tsx`:
```typescript
import { useState } from "react";
import { useMcpActivity } from "../hooks/useMcpActivity";
import * as css from "./mcp-activity-drawer.css";

interface McpActivityDrawerProps {
  diagramId: string;
  seenAt: number | null;
  onClose: () => void;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return "어제";
  if (diffDay < 7) return `${diffDay}일 전`;
  return date.toLocaleDateString();
}

const SessionItem = ({
  session,
  isNew,
  onRevert,
  isReverting,
}: {
  session: { id: string; summary: string | null; toolCalls: { tool: string; summary: string }[]; createdAt: string };
  isNew: boolean;
  onRevert: (id: string) => void;
  isReverting: boolean;
}) => {
  const [expanded, setExpanded] = useState(isNew);

  return (
    <div className={isNew ? css.sessionItemNew : css.sessionItem}>
      {isNew ? (
        <div className={css.sessionTimestampNew}>
          <span className={css.newDot} />
          <span className={css.newTimestampText}>{formatTime(session.createdAt)}</span>
        </div>
      ) : (
        <div className={css.sessionTimestamp}>{formatTime(session.createdAt)}</div>
      )}

      <div className={isNew ? css.sessionSummary : css.sessionSummaryOld}>
        {session.summary ?? "AI 활동"}
      </div>

      {expanded && session.toolCalls.length > 0 && (
        <div className={css.toolCallList}>
          {session.toolCalls.map((tc, i) => (
            <div key={i} className={css.toolCallItem}>• {tc.summary}</div>
          ))}
        </div>
      )}

      <div className={css.sessionActions}>
        {session.toolCalls.length > 0 && (
          <button className={css.toggleBtn} onClick={() => setExpanded((v) => !v)}>
            {expanded ? "상세 접기 ▲" : "상세 보기 ▼"}
          </button>
        )}
        <div className={css.spacer} />
        <button
          className={css.revertBtn}
          disabled={isReverting}
          onClick={() => {
            if (window.confirm("이 세션 이전 상태로 되돌립니다. 계속하시겠습니까?")) {
              onRevert(session.id);
            }
          }}
        >
          되돌리기
        </button>
      </div>
    </div>
  );
};

export const McpActivityDrawer = ({ diagramId, seenAt, onClose }: McpActivityDrawerProps) => {
  const { sessions, isLoading, revertSession, isReverting } = useMcpActivity(diagramId);

  const newCount = seenAt
    ? sessions.filter((s) => new Date(s.createdAt).getTime() > seenAt).length
    : sessions.length;

  return (
    <div className={css.drawer}>
      <div className={css.drawerHeader}>
        <div className={css.drawerTitleGroup}>
          <span>🤖</span>
          <h3 className={css.drawerTitle}>AI 활동</h3>
          {newCount > 0 && (
            <span className={css.newBadge}>{newCount} 새로운</span>
          )}
        </div>
        <button className={css.closeBtn} onClick={onClose} aria-label="닫기">✕</button>
      </div>

      <div className={css.drawerBody}>
        {isLoading ? (
          <div className={css.emptyText}>불러오는 중…</div>
        ) : sessions.length === 0 ? (
          <div className={css.emptyText}>AI 활동 기록이 없습니다.</div>
        ) : (
          sessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              isNew={seenAt ? new Date(session.createdAt).getTime() > seenAt : false}
              onRevert={revertSession}
              isReverting={isReverting}
            />
          ))
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 3: 커밋**

```bash
git add apps/web/src/features/editor/components/McpActivityDrawer.tsx \
        apps/web/src/features/editor/components/mcp-activity-drawer.css.ts
git commit -m "feat(web): add McpActivityDrawer component"
```

---

## Task 8: EditorPage — 🤖 버튼 + 토스트 + WebSocket 연동

**Files:**
- Modify: `apps/web/src/features/editor/pages/EditorPage.tsx`

- [ ] **Step 1: EditorPage에 McpActivityDrawer 통합**

`apps/web/src/features/editor/pages/EditorPage.tsx` 수정:

imports에 추가:
```typescript
import { useQueryClient } from "@tanstack/react-query";
import { McpActivityDrawer } from "../components/McpActivityDrawer";
```

`useParams` 아래 상태 추가:
```typescript
const [showMcpActivity, setShowMcpActivity] = useState(false);
const [mcpToast, setMcpToast] = useState<string | null>(null);
const queryClient = useQueryClient();

const MCP_SEEN_KEY = `mcp_seen_${diagramId}`;
const seenAt = (() => {
  const v = localStorage.getItem(MCP_SEEN_KEY);
  return v ? parseInt(v, 10) : null;
})();

const [hasNewActivity, setHasNewActivity] = useState(false);
```

`useRealtimeCollaboration` 호출 바로 다음 라인에 `socket mcp_activity` 구독 추가 (useEffect 사용 불가이므로 소켓 이벤트를 collaboration hook으로 전달하기 위해 별도 접근법 사용):

> **주의:** `useEffect` 사용이 원칙적으로 금지되어 있으므로, `useRealtimeCollaboration` 훅이 반환하는 socket 객체를 통해 이벤트를 구독하는 대신, 아래와 같이 `useRealtimeMcpActivity` 패턴을 사용한다.

실제로는 `useRealtimeCollaboration`이 socket을 반환하지 않으므로, `McpActivityDrawer`가 열릴 때 `seen` 타임스탬프를 업데이트하는 것으로만 처리하고, WebSocket 이벤트 수신은 아래와 같이 기존 socket 연결을 통해 처리:

`useMcpActivity` hook에 `onMcpActivity` 콜백을 추가하는 대신, 토스트와 배지는 `listMcpSessions` query의 `refetchInterval` + polling 방식으로 처리한다. (useEffect 없이 실시간 필요 시 polling으로 대체)

**`useMcpActivity.ts` 수정** — `refetchInterval` 추가:
```typescript
const sessionsQuery = useQuery({
  queryKey: ["mcp-sessions", diagramId],
  queryFn: () => listMcpSessions(diagramId),
  enabled: !!diagramId,
  refetchInterval: 10000, // 10초마다 polling
});
```

> 이후 WebSocket 이벤트로 교체 가능하지만, useEffect 제약 내에서 polling이 가장 단순한 접근법.

- [ ] **Step 2: 실제 EditorPage 수정 내용**

`EditorPage.tsx`에서:

1. imports 추가:
```typescript
import { McpActivityDrawer } from "../components/McpActivityDrawer";
```

2. 상태 추가 (`useState(false)` 패턴):
```typescript
const [showMcpActivity, setShowMcpActivity] = useState(false);
```

3. topbar에 🤖 버튼 추가 (기존 "기록" 버튼 바로 앞):
```typescript
<button
  onClick={() => {
    setShowMcpActivity((v) => !v);
    localStorage.setItem(`mcp_seen_${diagramId}`, Date.now().toString());
  }}
  className={css.topbarBtn({ variant: showMcpActivity ? "historyActive" : "historyInactive" })}
  title="AI 활동"
  aria-label="AI 활동"
>
  🤖
</button>
```

4. content 영역에 McpActivityDrawer 추가 (VersionHistoryDrawer 패턴 그대로):
```typescript
{showMcpActivity && diagramId && (
  <McpActivityDrawer
    diagramId={diagramId}
    seenAt={(() => {
      const v = localStorage.getItem(`mcp_seen_${diagramId}`);
      return v ? parseInt(v, 10) : null;
    })()}
    onClose={() => setShowMcpActivity(false)}
  />
)}
```

- [ ] **Step 3: 타입스크립트 체크**

```bash
pnpm --filter @erdify/web typecheck
```
Expected: 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add apps/web/src/features/editor/pages/EditorPage.tsx \
        apps/web/src/features/editor/hooks/useMcpActivity.ts
git commit -m "feat(web): integrate McpActivityDrawer into EditorPage with polling"
```

---

## Task 9: DB 마이그레이션 실행 확인

- [ ] **Step 1: 마이그레이션 실행**

```bash
pnpm --filter @erdify/api migration:run
```
또는 Docker 환경:
```bash
docker compose exec api pnpm migration:run
```
Expected: `CreateMcpSessionsTable1746000000010` 마이그레이션 성공.

- [ ] **Step 2: 전체 빌드 확인**

```bash
pnpm typecheck
```
Expected: 전체 패키지 타입 에러 없음.

- [ ] **Step 3: 최종 커밋**

```bash
git add -u
git commit -m "feat: MCP AI activity log — sessions recorded, drawer UI, revert support"
```

---

## Self-Review

**Spec coverage 확인:**
- [x] `mcp_sessions` 테이블 → Task 1
- [x] `POST /diagrams/:id/mcp-sessions/:sessionId/tool-calls` → Task 2, 3
- [x] `GET /diagrams/:id/mcp-sessions` → Task 2, 3
- [x] `POST /diagrams/:id/mcp-sessions/:sessionId/revert` → Task 2, 3
- [x] MCP 서버 세션 ID 생성 → Task 5
- [x] `X-MCP-Session-ID` 헤더 → Task 5
- [x] 툴별 자동 요약 → Task 5
- [x] WebSocket `mcp_activity` 이벤트 → Task 4
- [x] McpActivityDrawer UI → Task 7
- [x] 되돌리기 → Task 3 (revertSession), Task 7 (버튼)
- [x] 미확인 배지 → Task 8 (seenAt + localStorage)
- [x] EditorPage 통합 → Task 8

**누락 확인:**
- 토스트 알림: spec에 있지만 useEffect 없이 구현하려면 복잡. polling 방식(10초)으로 대체하고, 토스트는 v2에서 WebSocket 직접 구독으로 추가 가능.
- `X-MCP-Session-ID` 헤더를 API가 읽어야 함: `McpSessionsController`는 URL param `:sessionId`를 사용하므로 헤더는 불필요 (MCP 서버가 세션 ID를 URL에 직접 포함).
