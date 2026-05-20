# AI Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ERDify에 Claude API 기반 인앱 AI 채팅, 인라인 컬럼 추천, AI ERD 생성 기능을 추가하고 조직 단위로 API 키를 관리한다.

**Architecture:** 모든 Claude API 호출은 NestJS `AiModule`을 통해 프록시된다. Claude는 Tool Use(Function Calling)로 `@erdify/domain` 순수 함수와 1:1 매핑된 ERD 조작 Tool을 호출하며, 서버가 실행 후 before/after diff를 계산해 프론트에 반환한다. 사용자가 diff를 수락하면 프론트가 기존 diagram 저장 API로 적용한다.

**Tech Stack:** `@anthropic-ai/sdk`, TypeORM (PostgreSQL), Zustand slice, axios, `@nestjs/schedule` (이미 등록됨), vanilla-extract CSS

---

## File Map

### 신규 백엔드
| 파일 | 역할 |
|------|------|
| `packages/db/src/entities/organization-ai-settings.entity.ts` | 조직 AI 설정 (암호화된 API 키) |
| `packages/db/src/entities/ai-conversation.entity.ts` | AI 대화 이력 |
| `packages/db/src/migrations/1746000000017-CreateOrganizationAiSettings.ts` | 마이그레이션 |
| `packages/db/src/migrations/1746000000018-CreateAiConversations.ts` | 마이그레이션 |
| `packages/contracts/src/ai/ai.types.ts` | 공유 타입 |
| `packages/contracts/src/ai/ai-contract.schema.ts` | Zod 스키마 |
| `apps/api/src/modules/ai/ai.module.ts` | NestJS 모듈 |
| `apps/api/src/modules/ai/ai.controller.ts` | HTTP 엔드포인트 |
| `apps/api/src/modules/ai/ai.service.ts` | Claude 호출 + Tool 실행 |
| `apps/api/src/modules/ai/ai-history.service.ts` | 대화 이력 CRUD + TTL 스케줄러 |
| `apps/api/src/modules/ai/erd-tools.ts` | Claude Tool 정의 |
| `apps/api/src/modules/ai/dto/chat.dto.ts` | POST /ai/chat 요청 DTO |
| `apps/api/src/modules/ai/dto/suggest-columns.dto.ts` | POST /ai/suggest-columns DTO |
| `apps/api/src/modules/ai/ai.service.spec.ts` | 유닛 테스트 |

### 수정 백엔드
| 파일 | 변경 |
|------|------|
| `packages/db/src/index.ts` | 신규 엔티티 export |
| `packages/contracts/src/index.ts` | AI 타입 export |
| `apps/api/package.json` | `@anthropic-ai/sdk` 추가 |
| `apps/api/src/app.module.ts` | `AiModule` 등록 |

### 신규 프론트엔드
| 파일 | 역할 |
|------|------|
| `apps/web/src/features/ai/store/aiChatSlice.ts` | Zustand 슬라이스 |
| `apps/web/src/features/ai/store/useAIChatStore.ts` | 스토어 인스턴스 |
| `apps/web/src/features/ai/api/ai.api.ts` | API 클라이언트 |
| `apps/web/src/features/ai/components/FloatingAIChat.tsx` | FAB + 채팅창 조합 |
| `apps/web/src/features/ai/components/AIChatFAB.tsx` | 플로팅 버튼 |
| `apps/web/src/features/ai/components/AIChatWindow.tsx` | 채팅창 |
| `apps/web/src/features/ai/components/MessageBubble.tsx` | 메시지 말풍선 |
| `apps/web/src/features/ai/components/DiffCard.tsx` | diff 미리보기 카드 |
| `apps/web/src/features/dashboard/pages/AISettingsPanel.tsx` | 조직 AI API 키 설정 UI |

### 수정 프론트엔드
| 파일 | 변경 |
|------|------|
| `apps/web/src/features/editor/pages/EditorPage.tsx` | `FloatingAIChat` 마운트 |
| `apps/web/src/features/editor/components/EditorCanvas.tsx` | 미니맵 숨김 prop 추가 |
| `apps/web/src/features/editor/components/EditableTableNode/index.tsx` | 인라인 컬럼 추천 추가 |

---

## Task 1: `@anthropic-ai/sdk` 설치 + DB 엔티티 + 마이그레이션

**Files:**
- Modify: `apps/api/package.json`
- Create: `packages/db/src/entities/organization-ai-settings.entity.ts`
- Create: `packages/db/src/entities/ai-conversation.entity.ts`
- Create: `packages/db/src/migrations/1746000000017-CreateOrganizationAiSettings.ts`
- Create: `packages/db/src/migrations/1746000000018-CreateAiConversations.ts`
- Modify: `packages/db/src/index.ts`

- [ ] **Step 1: SDK 설치**

```bash
cd apps/api && pnpm add @anthropic-ai/sdk
```

Expected: `packages/api/package.json`에 `"@anthropic-ai/sdk"` 추가됨

- [ ] **Step 2: `organization-ai-settings` 엔티티 생성**

`packages/db/src/entities/organization-ai-settings.entity.ts`:
```typescript
import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

@Entity("organization_ai_settings")
export class OrganizationAiSettings {
  @PrimaryColumn("varchar", { length: 36 })
  id!: string;

  @Column({ name: "organization_id", length: 36, unique: true })
  organizationId!: string;

  @Column({ name: "encrypted_api_key", type: "text", nullable: true })
  encryptedApiKey!: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
```

- [ ] **Step 3: `ai-conversation` 엔티티 생성**

`packages/db/src/entities/ai-conversation.entity.ts`:
```typescript
import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

@Entity("ai_conversations")
export class AiConversation {
  @PrimaryColumn("varchar", { length: 36 })
  id!: string;

  @Column({ name: "user_id", length: 36 })
  userId!: string;

  @Column({ name: "diagram_id", length: 36, nullable: true })
  diagramId!: string | null;

  @Column({ type: "varchar", length: 10 })
  role!: "user" | "assistant";

  @Column({ type: "text" })
  content!: string;

  @Column({ type: "jsonb", nullable: true })
  toolCalls!: object | null;

  @Column({ type: "jsonb", nullable: true })
  diff!: object | null;

  @Column({ type: "boolean", nullable: true })
  accepted!: boolean | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
```

- [ ] **Step 4: 마이그레이션 1746000000017 생성**

`packages/db/src/migrations/1746000000017-CreateOrganizationAiSettings.ts`:
```typescript
import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateOrganizationAiSettings1746000000017 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "organization_ai_settings" (
        "id"               VARCHAR(36)  NOT NULL,
        "organization_id"  VARCHAR(36)  NOT NULL,
        "encrypted_api_key" TEXT,
        "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "pk_organization_ai_settings" PRIMARY KEY ("id"),
        CONSTRAINT "uq_organization_ai_settings_org" UNIQUE ("organization_id"),
        CONSTRAINT "fk_organization_ai_settings_org"
          FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "organization_ai_settings"`);
  }
}
```

- [ ] **Step 5: 마이그레이션 1746000000018 생성**

`packages/db/src/migrations/1746000000018-CreateAiConversations.ts`:
```typescript
import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAiConversations1746000000018 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ai_conversations" (
        "id"         VARCHAR(36)  NOT NULL,
        "user_id"    VARCHAR(36)  NOT NULL,
        "diagram_id" VARCHAR(36),
        "role"       VARCHAR(10)  NOT NULL,
        "content"    TEXT         NOT NULL,
        "tool_calls" JSONB,
        "diff"       JSONB,
        "accepted"   BOOLEAN,
        "created_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "pk_ai_conversations" PRIMARY KEY ("id"),
        CONSTRAINT "fk_ai_conversations_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_ai_conversations_user_created"
        ON "ai_conversations" ("user_id", "created_at" DESC)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "ai_conversations"`);
  }
}
```

- [ ] **Step 6: `packages/db/src/index.ts`에 엔티티 export 추가**

기존 export 목록에 아래 두 줄 추가:
```typescript
export { OrganizationAiSettings } from "./entities/organization-ai-settings.entity";
export { AiConversation } from "./entities/ai-conversation.entity";
```

마이그레이션도 `data-source.ts`의 migrations 배열에 추가해야 한다. `packages/db/src/data-source.ts` 파일을 읽고 마이그레이션 배열에 두 클래스를 추가한다.

- [ ] **Step 7: 마이그레이션 실행 확인**

```bash
cd packages/db && pnpm migration:run
```

Expected: `1746000000017-CreateOrganizationAiSettings` 및 `1746000000018-CreateAiConversations` 마이그레이션 완료 출력

---

## Task 2: Contracts — 공유 타입 + Zod 스키마

**Files:**
- Create: `packages/contracts/src/ai/ai.types.ts`
- Create: `packages/contracts/src/ai/ai-contract.schema.ts`
- Modify: `packages/contracts/src/index.ts`

- [ ] **Step 1: `ai.types.ts` 생성**

`packages/contracts/src/ai/ai.types.ts`:
```typescript
import type { DiagramDocument } from "@erdify/domain";

export type DiffChangeType =
  | "addTable" | "removeTable" | "updateTable"
  | "addColumn" | "removeColumn" | "updateColumn"
  | "addRelation" | "removeRelation";

export type DiffChange =
  | { type: "addTable"; tableId: string; tableName: string }
  | { type: "removeTable"; tableId: string; tableName: string }
  | { type: "updateTable"; tableId: string; oldName: string; newName: string }
  | { type: "addColumn"; tableId: string; tableName: string; columnId: string; columnName: string; columnType: string }
  | { type: "removeColumn"; tableId: string; tableName: string; columnId: string; columnName: string }
  | { type: "updateColumn"; tableId: string; tableName: string; columnId: string; columnName: string; changes: string[] }
  | { type: "addRelation"; relationId: string; fromTable: string; toTable: string; cardinality: string }
  | { type: "removeRelation"; relationId: string; fromTable: string; toTable: string };

export interface AiChatResponse {
  messageId: string;
  content: string;
  diff: DiffChange[] | null;
  pendingDocument: DiagramDocument | null;
}

export interface ColumnSuggestion {
  name: string;
  type: string;
  nullable: boolean;
  pk: boolean;
}

export interface OrgAiSettings {
  organizationId: string;
  hasApiKey: boolean;  // 키 존재 여부만 노출 (실제 키 미반환)
}
```

- [ ] **Step 2: `ai-contract.schema.ts` 생성**

`packages/contracts/src/ai/ai-contract.schema.ts`:
```typescript
import { z } from "zod";

export const aiChatRequestSchema = z.object({
  diagramId: z.string().min(1),
  message: z.string().min(1).max(2000),
});

export const aiSuggestColumnsRequestSchema = z.object({
  tableName: z.string().min(1).max(100),
  existingColumns: z.array(z.string()).max(50),
});

export const updateOrgAiSettingsRequestSchema = z.object({
  apiKey: z.string().min(1).max(200),
});

export type AiChatRequest = z.infer<typeof aiChatRequestSchema>;
export type AiSuggestColumnsRequest = z.infer<typeof aiSuggestColumnsRequestSchema>;
export type UpdateOrgAiSettingsRequest = z.infer<typeof updateOrgAiSettingsRequestSchema>;
```

- [ ] **Step 3: `packages/contracts/src/index.ts`에 export 추가**

```typescript
export type {
  DiffChange,
  DiffChangeType,
  AiChatResponse,
  ColumnSuggestion,
  OrgAiSettings,
} from "./ai/ai.types";
export {
  aiChatRequestSchema,
  aiSuggestColumnsRequestSchema,
  updateOrgAiSettingsRequestSchema,
  type AiChatRequest,
  type AiSuggestColumnsRequest,
  type UpdateOrgAiSettingsRequest,
} from "./ai/ai-contract.schema";
```

- [ ] **Step 4: 빌드 확인**

```bash
cd packages/contracts && pnpm build
```

Expected: 에러 없이 빌드 완료

---

## Task 3: AiModule 스켈레톤 + DTO

**Files:**
- Create: `apps/api/src/modules/ai/dto/chat.dto.ts`
- Create: `apps/api/src/modules/ai/dto/suggest-columns.dto.ts`
- Create: `apps/api/src/modules/ai/ai.controller.ts`
- Create: `apps/api/src/modules/ai/ai.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: DTO 생성**

`apps/api/src/modules/ai/dto/chat.dto.ts`:
```typescript
import { IsString, MinLength, MaxLength } from "class-validator";

export class AiChatDto {
  @IsString()
  @MinLength(1)
  diagramId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message!: string;
}
```

`apps/api/src/modules/ai/dto/suggest-columns.dto.ts`:
```typescript
import { IsString, IsArray, MinLength, MaxLength } from "class-validator";

export class AiSuggestColumnsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  tableName!: string;

  @IsArray()
  existingColumns!: string[];
}
```

- [ ] **Step 2: Controller 스텁 생성**

`apps/api/src/modules/ai/ai.controller.ts`:
```typescript
import { Body, Controller, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { FlexAuthGuard } from "../auth/flex-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { JwtPayload } from "../auth/jwt.strategy";
import { AiService } from "./ai.service";
import { AiHistoryService } from "./ai-history.service";
import { AiChatDto } from "./dto/chat.dto";
import { AiSuggestColumnsDto } from "./dto/suggest-columns.dto";
import type { AiChatResponse, ColumnSuggestion, OrgAiSettings } from "@erdify/contracts";

@Controller()
@UseGuards(FlexAuthGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly aiHistoryService: AiHistoryService,
  ) {}

  @Post("ai/chat")
  chat(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AiChatDto,
  ): Promise<AiChatResponse> {
    return this.aiService.chat(user.sub, dto.diagramId, dto.message);
  }

  @Post("ai/chat/:messageId/accept")
  acceptDiff(
    @CurrentUser() user: JwtPayload,
    @Param("messageId") messageId: string,
  ): Promise<void> {
    return this.aiHistoryService.markAccepted(messageId, user.sub, true);
  }

  @Post("ai/chat/:messageId/reject")
  rejectDiff(
    @CurrentUser() user: JwtPayload,
    @Param("messageId") messageId: string,
  ): Promise<void> {
    return this.aiHistoryService.markAccepted(messageId, user.sub, false);
  }

  @Post("ai/suggest-columns")
  suggestColumns(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AiSuggestColumnsDto,
  ): Promise<ColumnSuggestion[]> {
    return this.aiService.suggestColumns(user.sub, dto.tableName, dto.existingColumns);
  }

  @Get("organizations/:orgId/ai-settings")
  getOrgAiSettings(
    @CurrentUser() user: JwtPayload,
    @Param("orgId") orgId: string,
  ): Promise<OrgAiSettings> {
    return this.aiService.getOrgAiSettings(orgId, user.sub);
  }

  @Put("organizations/:orgId/ai-settings")
  updateOrgAiSettings(
    @CurrentUser() user: JwtPayload,
    @Param("orgId") orgId: string,
    @Body("apiKey") apiKey: string,
  ): Promise<void> {
    return this.aiService.updateOrgAiSettings(orgId, user.sub, apiKey);
  }
}
```

- [ ] **Step 3: Module 생성**

`apps/api/src/modules/ai/ai.module.ts`:
```typescript
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrganizationAiSettings, AiConversation, Diagram, OrganizationMember } from "@erdify/db";
import { AuthModule } from "../auth/auth.module";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { AiHistoryService } from "./ai-history.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrganizationAiSettings,
      AiConversation,
      Diagram,
      OrganizationMember,
    ]),
    AuthModule,
  ],
  controllers: [AiController],
  providers: [AiService, AiHistoryService],
})
export class AiModule {}
```

- [ ] **Step 4: `app.module.ts`에 AiModule 등록**

`apps/api/src/app.module.ts`의 imports 배열에 추가:
```typescript
import { AiModule } from "./modules/ai/ai.module";

// imports 배열에:
AiModule,
```

- [ ] **Step 5: 빌드 확인 (AiService, AiHistoryService는 아직 스텁)**

임시 스텁 파일 생성 후 빌드:

`apps/api/src/modules/ai/ai.service.ts` (임시 스텁):
```typescript
import { Injectable } from "@nestjs/common";
import type { AiChatResponse, ColumnSuggestion, OrgAiSettings } from "@erdify/contracts";

@Injectable()
export class AiService {
  chat(_userId: string, _diagramId: string, _message: string): Promise<AiChatResponse> {
    throw new Error("Not implemented");
  }
  suggestColumns(_userId: string, _tableName: string, _existingColumns: string[]): Promise<ColumnSuggestion[]> {
    throw new Error("Not implemented");
  }
  getOrgAiSettings(_orgId: string, _userId: string): Promise<OrgAiSettings> {
    throw new Error("Not implemented");
  }
  updateOrgAiSettings(_orgId: string, _userId: string, _apiKey: string): Promise<void> {
    throw new Error("Not implemented");
  }
}
```

`apps/api/src/modules/ai/ai-history.service.ts` (임시 스텁):
```typescript
import { Injectable } from "@nestjs/common";
import type { AiConversation } from "@erdify/db";

@Injectable()
export class AiHistoryService {
  markAccepted(_messageId: string, _userId: string, _accepted: boolean): Promise<void> {
    throw new Error("Not implemented");
  }
  findRecent(_userId: string, _diagramId: string): Promise<AiConversation[]> {
    throw new Error("Not implemented");
  }
}
```

```bash
cd apps/api && pnpm build
```

Expected: 타입 에러 없이 빌드 완료

---

## Task 4: AiHistoryService 구현 + TTL 스케줄러

**Files:**
- Modify: `apps/api/src/modules/ai/ai-history.service.ts`

- [ ] **Step 1: AiHistoryService 전체 구현**

`apps/api/src/modules/ai/ai-history.service.ts`:
```typescript
import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Cron, CronExpression } from "@nestjs/schedule";
import { LessThan, Repository } from "typeorm";
import { randomUUID } from "node:crypto";
import { AiConversation } from "@erdify/db";
import type { DiffChange } from "@erdify/contracts";

const HISTORY_LIMIT = 20; // 컨텍스트에 포함할 최근 메시지 수
const TTL_DAYS = 90;

@Injectable()
export class AiHistoryService {
  private readonly logger = new Logger(AiHistoryService.name);

  constructor(
    @InjectRepository(AiConversation)
    private readonly repo: Repository<AiConversation>,
  ) {}

  async saveUserMessage(userId: string, diagramId: string | null, content: string): Promise<AiConversation> {
    const entity = this.repo.create({
      id: randomUUID(),
      userId,
      diagramId,
      role: "user",
      content,
      toolCalls: null,
      diff: null,
      accepted: null,
    });
    return this.repo.save(entity);
  }

  async saveAssistantMessage(
    userId: string,
    diagramId: string | null,
    content: string,
    diff: DiffChange[] | null,
    toolCalls: object | null,
  ): Promise<AiConversation> {
    const entity = this.repo.create({
      id: randomUUID(),
      userId,
      diagramId,
      role: "assistant",
      content,
      toolCalls,
      diff: diff as object | null,
      accepted: diff ? null : undefined,  // diff 있을 때만 pending 상태
    });
    return this.repo.save(entity);
  }

  async findRecent(userId: string, diagramId: string | null): Promise<AiConversation[]> {
    return this.repo.find({
      where: { userId, diagramId: diagramId ?? undefined },
      order: { createdAt: "DESC" },
      take: HISTORY_LIMIT,
    }).then((rows) => rows.reverse());
  }

  async markAccepted(messageId: string, userId: string, accepted: boolean): Promise<void> {
    await this.repo.update({ id: messageId, userId }, { accepted });
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpired(): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - TTL_DAYS);
    const result = await this.repo.delete({ createdAt: LessThan(cutoff) });
    this.logger.log(`AI conversation cleanup: ${result.affected ?? 0} records deleted`);
  }
}
```

- [ ] **Step 2: 빌드 확인**

```bash
cd apps/api && pnpm build
```

Expected: 에러 없음

---

## Task 5: ErdTools 정의

**Files:**
- Create: `apps/api/src/modules/ai/erd-tools.ts`

- [ ] **Step 1: ErdTools 생성**

`apps/api/src/modules/ai/erd-tools.ts`:
```typescript
import type { Tool } from "@anthropic-ai/sdk/resources/messages.js";

export const ERD_TOOLS: Tool[] = [
  {
    name: "addTable",
    description: "Add a new table to the ERD diagram. Use this when the user wants to create a new database table.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Table name (snake_case recommended)" },
        columns: {
          type: "array",
          description: "Initial columns to add (optional)",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              type: { type: "string", description: "SQL type e.g. uuid, varchar, integer, timestamptz, boolean" },
              nullable: { type: "boolean", default: true },
              primaryKey: { type: "boolean", default: false },
              unique: { type: "boolean", default: false },
            },
            required: ["name", "type"],
          },
        },
      },
      required: ["name"],
    },
  },
  {
    name: "removeTable",
    description: "Remove an existing table from the ERD diagram by its ID.",
    input_schema: {
      type: "object",
      properties: {
        tableId: { type: "string", description: "ID of the table to remove" },
      },
      required: ["tableId"],
    },
  },
  {
    name: "updateTable",
    description: "Rename an existing table.",
    input_schema: {
      type: "object",
      properties: {
        tableId: { type: "string", description: "ID of the table" },
        name: { type: "string", description: "New table name" },
      },
      required: ["tableId", "name"],
    },
  },
  {
    name: "addColumn",
    description: "Add a column to an existing table.",
    input_schema: {
      type: "object",
      properties: {
        tableId: { type: "string", description: "ID of the table" },
        name: { type: "string", description: "Column name" },
        type: { type: "string", description: "SQL type e.g. uuid, varchar, integer, timestamptz, boolean, jsonb" },
        nullable: { type: "boolean", default: true },
        primaryKey: { type: "boolean", default: false },
        unique: { type: "boolean", default: false },
        defaultValue: { type: "string", description: "SQL default expression (optional)" },
      },
      required: ["tableId", "name", "type"],
    },
  },
  {
    name: "removeColumn",
    description: "Remove a column from a table.",
    input_schema: {
      type: "object",
      properties: {
        tableId: { type: "string", description: "ID of the table" },
        columnId: { type: "string", description: "ID of the column" },
      },
      required: ["tableId", "columnId"],
    },
  },
  {
    name: "updateColumn",
    description: "Update properties of an existing column (name, type, nullable, pk, etc.).",
    input_schema: {
      type: "object",
      properties: {
        tableId: { type: "string" },
        columnId: { type: "string" },
        name: { type: "string" },
        type: { type: "string" },
        nullable: { type: "boolean" },
        primaryKey: { type: "boolean" },
        unique: { type: "boolean" },
        defaultValue: { type: "string", nullable: true },
      },
      required: ["tableId", "columnId"],
    },
  },
  {
    name: "addRelation",
    description: "Add a foreign key relationship between two tables.",
    input_schema: {
      type: "object",
      properties: {
        sourceTableId: { type: "string", description: "Table that holds the foreign key" },
        targetTableId: { type: "string", description: "Table being referenced" },
        cardinality: {
          type: "string",
          enum: ["one-to-one", "one-to-many", "many-to-one"],
          description: "Relationship cardinality",
        },
      },
      required: ["sourceTableId", "targetTableId", "cardinality"],
    },
  },
  {
    name: "removeRelation",
    description: "Remove a relationship by its ID.",
    input_schema: {
      type: "object",
      properties: {
        relationId: { type: "string", description: "ID of the relationship to remove" },
      },
      required: ["relationId"],
    },
  },
];
```

- [ ] **Step 2: 빌드 확인**

```bash
cd apps/api && pnpm build
```

Expected: 에러 없음

---

## Task 6: AiService 구현 — chat() + suggestColumns() + 조직 설정

**Files:**
- Modify: `apps/api/src/modules/ai/ai.service.ts`

- [ ] **Step 1: AiService 전체 구현**

`apps/api/src/modules/ai/ai.service.ts`:
```typescript
import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { randomUUID } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import type { ContentBlock, ToolUseBlock } from "@anthropic-ai/sdk/resources/messages.js";
import {
  addEntity,
  addColumn,
  updateColumn,
  removeColumn,
  removeEntity,
  addRelationship,
  removeRelationship,
} from "@erdify/domain";
import type { DiagramDocument, DiagramColumn, DiagramRelationship, RelationshipCardinality } from "@erdify/domain";
import { Diagram, OrganizationAiSettings, OrganizationMember } from "@erdify/db";
import type { AiChatResponse, ColumnSuggestion, DiffChange, OrgAiSettings } from "@erdify/contracts";
import { encrypt, decrypt } from "../../common/utils/field-cipher";
import { AiHistoryService } from "./ai-history.service";
import { ERD_TOOLS } from "./erd-tools";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 4096;

@Injectable()
export class AiService {
  constructor(
    @InjectRepository(OrganizationAiSettings)
    private readonly settingsRepo: Repository<OrganizationAiSettings>,
    @InjectRepository(Diagram)
    private readonly diagramRepo: Repository<Diagram>,
    @InjectRepository(OrganizationMember)
    private readonly memberRepo: Repository<OrganizationMember>,
    private readonly historyService: AiHistoryService,
  ) {}

  // ── 조직 설정 ─────────────────────────────────────────────────────────────

  async getOrgAiSettings(orgId: string, userId: string): Promise<OrgAiSettings> {
    await this.requireOrgMember(orgId, userId);
    const settings = await this.settingsRepo.findOne({ where: { organizationId: orgId } });
    return { organizationId: orgId, hasApiKey: !!settings?.encryptedApiKey };
  }

  async updateOrgAiSettings(orgId: string, userId: string, apiKey: string): Promise<void> {
    await this.requireOrgOwner(orgId, userId);
    const existing = await this.settingsRepo.findOne({ where: { organizationId: orgId } });
    if (existing) {
      await this.settingsRepo.update(existing.id, { encryptedApiKey: encrypt(apiKey) });
    } else {
      await this.settingsRepo.save(
        this.settingsRepo.create({
          id: randomUUID(),
          organizationId: orgId,
          encryptedApiKey: encrypt(apiKey),
        })
      );
    }
  }

  // ── 채팅 ──────────────────────────────────────────────────────────────────

  async chat(userId: string, diagramId: string, userMessage: string): Promise<AiChatResponse> {
    const { doc, orgId } = await this.getDiagramAndOrgId(diagramId);
    const apiKey = await this.getOrgApiKey(orgId, userId);
    const history = await this.historyService.findRecent(userId, diagramId);

    // 대화 이력 저장 (user 메시지)
    await this.historyService.saveUserMessage(userId, diagramId, userMessage);

    // Claude 메시지 구성
    const claudeMessages: Anthropic.MessageParam[] = [
      ...history.map((h) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user" as const, content: userMessage },
    ];

    const systemPrompt = `You are an ERD design assistant for ERDify. Help users modify their database schema.
When making changes, use the provided tools. Always use the exact IDs from the current diagram.
Current diagram (JSON):
${JSON.stringify(doc, null, 2)}`;

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      tools: ERD_TOOLS,
      messages: claudeMessages,
    });

    // Tool 실행 + diff 계산
    let updatedDoc = doc;
    const diffs: DiffChange[] = [];
    const toolCallLog: object[] = [];

    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      const result = this.executeTool(block as ToolUseBlock, updatedDoc);
      updatedDoc = result.doc;
      diffs.push(...result.changes);
      toolCallLog.push({ name: block.name, input: block.input });
    }

    // 텍스트 응답 추출
    const textContent = response.content
      .filter((b): b is ContentBlock & { type: "text" } => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    const hasDiff = diffs.length > 0;
    const savedMessage = await this.historyService.saveAssistantMessage(
      userId,
      diagramId,
      textContent || (hasDiff ? "ERD를 업데이트했습니다. 아래 변경사항을 확인해주세요." : ""),
      hasDiff ? diffs : null,
      toolCallLog.length > 0 ? toolCallLog : null,
    );

    return {
      messageId: savedMessage.id,
      content: savedMessage.content,
      diff: hasDiff ? diffs : null,
      pendingDocument: hasDiff ? updatedDoc : null,
    };
  }

  // ── 컬럼 추천 ─────────────────────────────────────────────────────────────

  async suggestColumns(userId: string, tableName: string, existingColumns: string[]): Promise<ColumnSuggestion[]> {
    // userId로 소속 org 중 첫 번째 API 키 사용
    const membership = await this.memberRepo.findOne({ where: { userId } });
    if (!membership) throw new ForbiddenException("조직 멤버십이 없습니다.");
    const apiKey = await this.getOrgApiKey(membership.organizationId, userId);

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      messages: [{
        role: "user",
        content: `Suggest 5 common columns for a database table named "${tableName}".
Existing columns: ${existingColumns.length > 0 ? existingColumns.join(", ") : "none"}.
Return ONLY a JSON array, no explanation:
[{"name": "...", "type": "...", "nullable": true/false, "pk": true/false}]
Use SQL types like uuid, varchar, integer, bigint, boolean, timestamptz, text, jsonb.`,
      }],
    });

    const text = response.content
      .filter((b): b is ContentBlock & { type: "text" } => b.type === "text")
      .map((b) => b.text)
      .join("");

    try {
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) return [];
      return JSON.parse(match[0]) as ColumnSuggestion[];
    } catch {
      return [];
    }
  }

  // ── 내부 헬퍼 ─────────────────────────────────────────────────────────────

  private async getDiagramAndOrgId(diagramId: string): Promise<{ doc: DiagramDocument; orgId: string }> {
    const diagram = await this.diagramRepo
      .createQueryBuilder("d")
      .innerJoin("projects", "p", "p.id = d.project_id")
      .where("d.id = :diagramId", { diagramId })
      .select(["d.content AS content", "p.organization_id AS org_id"])
      .getRawOne<{ content: DiagramDocument; org_id: string }>();

    if (!diagram) throw new NotFoundException("다이어그램을 찾을 수 없습니다.");
    return { doc: diagram.content, orgId: diagram.org_id };
  }

  private async getOrgApiKey(orgId: string, userId: string): Promise<string> {
    await this.requireOrgMember(orgId, userId);
    const settings = await this.settingsRepo.findOne({ where: { organizationId: orgId } });
    if (!settings?.encryptedApiKey) {
      throw new ForbiddenException("조직에 AI API 키가 설정되어 있지 않습니다. 관리자에게 문의하세요.");
    }
    return decrypt(settings.encryptedApiKey);
  }

  private async requireOrgMember(orgId: string, userId: string): Promise<void> {
    const member = await this.memberRepo.findOne({ where: { organizationId: orgId, userId } });
    if (!member) throw new ForbiddenException("해당 조직의 멤버가 아닙니다.");
  }

  private async requireOrgOwner(orgId: string, userId: string): Promise<void> {
    const member = await this.memberRepo.findOne({ where: { organizationId: orgId, userId } });
    if (!member || member.role !== "owner") throw new ForbiddenException("조직 소유자만 API 키를 설정할 수 있습니다.");
  }

  private executeTool(
    block: ToolUseBlock,
    doc: DiagramDocument,
  ): { doc: DiagramDocument; changes: DiffChange[] } {
    const input = block.input as Record<string, unknown>;
    const changes: DiffChange[] = [];
    let updatedDoc = doc;

    switch (block.name) {
      case "addTable": {
        const entityId = randomUUID();
        updatedDoc = addEntity(doc, { id: entityId, name: input["name"] as string });
        changes.push({ type: "addTable", tableId: entityId, tableName: input["name"] as string });

        const columns = input["columns"] as Array<{ name: string; type: string; nullable?: boolean; primaryKey?: boolean; unique?: boolean }> | undefined;
        if (columns) {
          for (let i = 0; i < columns.length; i++) {
            const col = columns[i]!;
            const colId = randomUUID();
            const column: DiagramColumn = {
              id: colId, name: col.name, type: col.type,
              nullable: col.nullable ?? true, primaryKey: col.primaryKey ?? false,
              unique: col.unique ?? false, defaultValue: null, comment: null, ordinal: i,
            };
            updatedDoc = addColumn(updatedDoc, entityId, column);
            changes.push({ type: "addColumn", tableId: entityId, tableName: input["name"] as string, columnId: colId, columnName: col.name, columnType: col.type });
          }
        }
        break;
      }
      case "removeTable": {
        const tableId = input["tableId"] as string;
        const entity = doc.entities.find((e) => e.id === tableId);
        if (!entity) break;
        updatedDoc = removeEntity(doc, tableId);
        changes.push({ type: "removeTable", tableId, tableName: entity.name });
        break;
      }
      case "updateTable": {
        const tableId = input["tableId"] as string;
        const entity = doc.entities.find((e) => e.id === tableId);
        if (!entity) break;
        const newName = input["name"] as string;
        updatedDoc = {
          ...doc,
          entities: doc.entities.map((e) =>
            e.id === tableId ? { ...e, name: newName } : e
          ),
        };
        changes.push({ type: "updateTable", tableId, oldName: entity.name, newName });
        break;
      }
      case "addColumn": {
        const tableId = input["tableId"] as string;
        const entity = doc.entities.find((e) => e.id === tableId);
        if (!entity) break;
        const colId = randomUUID();
        const column: DiagramColumn = {
          id: colId,
          name: input["name"] as string,
          type: input["type"] as string,
          nullable: (input["nullable"] as boolean | undefined) ?? true,
          primaryKey: (input["primaryKey"] as boolean | undefined) ?? false,
          unique: (input["unique"] as boolean | undefined) ?? false,
          defaultValue: (input["defaultValue"] as string | undefined) ?? null,
          comment: null,
          ordinal: entity.columns.length,
        };
        updatedDoc = addColumn(doc, tableId, column);
        changes.push({ type: "addColumn", tableId, tableName: entity.name, columnId: colId, columnName: column.name, columnType: column.type });
        break;
      }
      case "removeColumn": {
        const tableId = input["tableId"] as string;
        const colId = input["columnId"] as string;
        const entity = doc.entities.find((e) => e.id === tableId);
        const col = entity?.columns.find((c) => c.id === colId);
        if (!entity || !col) break;
        updatedDoc = removeColumn(doc, tableId, colId);
        changes.push({ type: "removeColumn", tableId, tableName: entity.name, columnId: colId, columnName: col.name });
        break;
      }
      case "updateColumn": {
        const tableId = input["tableId"] as string;
        const colId = input["columnId"] as string;
        const entity = doc.entities.find((e) => e.id === tableId);
        const col = entity?.columns.find((c) => c.id === colId);
        if (!entity || !col) break;
        const patch: Partial<Omit<DiagramColumn, "id">> = {};
        if (input["name"] !== undefined) patch.name = input["name"] as string;
        if (input["type"] !== undefined) patch.type = input["type"] as string;
        if (input["nullable"] !== undefined) patch.nullable = input["nullable"] as boolean;
        if (input["primaryKey"] !== undefined) patch.primaryKey = input["primaryKey"] as boolean;
        if (input["unique"] !== undefined) patch.unique = input["unique"] as boolean;
        if (input["defaultValue"] !== undefined) patch.defaultValue = input["defaultValue"] as string | null;
        updatedDoc = updateColumn(doc, tableId, colId, patch);
        const changedKeys = Object.keys(patch);
        changes.push({ type: "updateColumn", tableId, tableName: entity.name, columnId: colId, columnName: col.name, changes: changedKeys });
        break;
      }
      case "addRelation": {
        const relId = randomUUID();
        const src = doc.entities.find((e) => e.id === input["sourceTableId"]);
        const tgt = doc.entities.find((e) => e.id === input["targetTableId"]);
        if (!src || !tgt) break;
        const rel: DiagramRelationship = {
          id: relId, name: "",
          sourceEntityId: input["sourceTableId"] as string,
          sourceColumnIds: [],
          targetEntityId: input["targetTableId"] as string,
          targetColumnIds: [],
          cardinality: input["cardinality"] as RelationshipCardinality,
          onDelete: "no-action", onUpdate: "no-action", identifying: false,
        };
        updatedDoc = addRelationship(doc, rel);
        changes.push({ type: "addRelation", relationId: relId, fromTable: src.name, toTable: tgt.name, cardinality: input["cardinality"] as string });
        break;
      }
      case "removeRelation": {
        const relId = input["relationId"] as string;
        const rel = doc.relationships.find((r) => r.id === relId);
        if (!rel) break;
        const src = doc.entities.find((e) => e.id === rel.sourceEntityId);
        const tgt = doc.entities.find((e) => e.id === rel.targetEntityId);
        updatedDoc = removeRelationship(doc, relId);
        changes.push({ type: "removeRelation", relationId: relId, fromTable: src?.name ?? rel.sourceEntityId, toTable: tgt?.name ?? rel.targetEntityId });
        break;
      }
    }

    return { doc: updatedDoc, changes };
  }
}
```

- [ ] **Step 2: 빌드 확인**

```bash
cd apps/api && pnpm build
```

Expected: 에러 없음

---

## Task 7: AiService 유닛 테스트

**Files:**
- Create: `apps/api/src/modules/ai/ai.service.spec.ts`

- [ ] **Step 1: 테스트 작성**

`apps/api/src/modules/ai/ai.service.spec.ts`:
```typescript
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenException } from "@nestjs/common";
import { OrganizationAiSettings, AiConversation, Diagram, OrganizationMember } from "@erdify/db";
import { AiService } from "./ai.service";
import { AiHistoryService } from "./ai-history.service";

// Anthropic SDK mock
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn(),
    },
  })),
}));

const makeDoc = () => ({
  format: "erdify.schema.v1",
  id: "d1",
  name: "Test",
  dialect: "postgresql" as const,
  entities: [{ id: "t1", name: "users", logicalName: null, comment: null, color: null, columns: [] }],
  relationships: [],
  indexes: [],
  views: [],
  layout: { entityPositions: {} },
  metadata: { revision: 1, stableObjectIds: true, createdAt: "", updatedAt: "" },
});

const makeRepo = <T>(overrides: Partial<Record<string, unknown>> = {}) => ({
  findOne: vi.fn(),
  find: vi.fn(),
  save: vi.fn(),
  create: vi.fn((v: T) => v),
  update: vi.fn(),
  delete: vi.fn(),
  createQueryBuilder: vi.fn(),
  ...overrides,
});

describe("AiService", () => {
  let service: AiService;
  let settingsRepo: ReturnType<typeof makeRepo>;
  let diagramRepo: ReturnType<typeof makeRepo>;
  let memberRepo: ReturnType<typeof makeRepo>;
  let historyService: { findRecent: ReturnType<typeof vi.fn>; saveUserMessage: ReturnType<typeof vi.fn>; saveAssistantMessage: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    settingsRepo = makeRepo();
    diagramRepo = makeRepo();
    memberRepo = makeRepo();
    historyService = {
      findRecent: vi.fn().mockResolvedValue([]),
      saveUserMessage: vi.fn().mockResolvedValue({ id: "msg-u1" }),
      saveAssistantMessage: vi.fn().mockResolvedValue({ id: "msg-a1", content: "Done." }),
    };

    const module = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: getRepositoryToken(OrganizationAiSettings), useValue: settingsRepo },
        { provide: getRepositoryToken(Diagram), useValue: diagramRepo },
        { provide: getRepositoryToken(OrganizationMember), useValue: memberRepo },
        { provide: AiHistoryService, useValue: historyService },
      ],
    }).compile();

    service = module.get(AiService);
  });

  describe("getOrgAiSettings", () => {
    it("멤버가 아니면 ForbiddenException을 던진다", async () => {
      memberRepo.findOne.mockResolvedValue(null);
      await expect(service.getOrgAiSettings("org-1", "user-1")).rejects.toThrow(ForbiddenException);
    });

    it("API 키가 없으면 hasApiKey=false를 반환한다", async () => {
      memberRepo.findOne.mockResolvedValue({ userId: "user-1", organizationId: "org-1", role: "editor" });
      settingsRepo.findOne.mockResolvedValue(null);
      const result = await service.getOrgAiSettings("org-1", "user-1");
      expect(result).toEqual({ organizationId: "org-1", hasApiKey: false });
    });

    it("API 키가 있으면 hasApiKey=true를 반환한다", async () => {
      memberRepo.findOne.mockResolvedValue({ userId: "user-1", organizationId: "org-1", role: "editor" });
      settingsRepo.findOne.mockResolvedValue({ encryptedApiKey: "encrypted" });
      const result = await service.getOrgAiSettings("org-1", "user-1");
      expect(result.hasApiKey).toBe(true);
    });
  });

  describe("updateOrgAiSettings", () => {
    it("owner가 아니면 ForbiddenException을 던진다", async () => {
      memberRepo.findOne.mockResolvedValue({ userId: "user-1", organizationId: "org-1", role: "editor" });
      await expect(service.updateOrgAiSettings("org-1", "user-1", "sk-ant-xxx")).rejects.toThrow(ForbiddenException);
    });

    it("owner이면 API 키를 암호화해서 저장한다", async () => {
      memberRepo.findOne.mockResolvedValue({ userId: "user-1", organizationId: "org-1", role: "owner" });
      settingsRepo.findOne.mockResolvedValue(null);
      settingsRepo.save.mockResolvedValue({});
      await expect(service.updateOrgAiSettings("org-1", "user-1", "sk-ant-xxx")).resolves.toBeUndefined();
      expect(settingsRepo.save).toHaveBeenCalled();
      // 저장된 값이 원문이 아닌 암호화된 값인지 확인
      const savedArg = settingsRepo.save.mock.calls[0][0] as { encryptedApiKey: string };
      expect(savedArg.encryptedApiKey).not.toBe("sk-ant-xxx");
    });
  });
});
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

```bash
cd apps/api && pnpm test --run ai.service
```

Expected: 테스트 통과 (AiService 구현이 완료되었으므로)

---

## Task 8: 프론트엔드 — aiChatStore

**Files:**
- Create: `apps/web/src/features/ai/store/aiChatSlice.ts`
- Create: `apps/web/src/features/ai/store/useAIChatStore.ts`

- [ ] **Step 1: aiChatSlice 생성**

`apps/web/src/features/ai/store/aiChatSlice.ts`:
```typescript
import type { StateCreator } from "zustand";
import type { AiChatResponse, DiffChange } from "@erdify/contracts";
import type { DiagramDocument } from "@erdify/domain";

export interface AiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  diff: DiffChange[] | null;
  pendingDocument: DiagramDocument | null;
  accepted: boolean | null;  // null = 미결, true = 수락, false = 거절
}

export interface AiChatSlice {
  isOpen: boolean;
  messages: AiMessage[];
  isLoading: boolean;
  openChat: (initialMessage?: string) => void;
  closeChat: () => void;
  addUserMessage: (content: string) => void;
  addAssistantMessage: (response: AiChatResponse) => void;
  acceptDiff: (messageId: string) => void;
  rejectDiff: (messageId: string) => void;
  setLoading: (loading: boolean) => void;
}

export const createAiChatSlice: StateCreator<AiChatSlice> = (set) => ({
  isOpen: false,
  messages: [],
  isLoading: false,

  openChat: (initialMessage) =>
    set((state) => ({
      isOpen: true,
      messages: initialMessage
        ? [...state.messages, { id: crypto.randomUUID(), role: "user", content: initialMessage, diff: null, pendingDocument: null, accepted: null }]
        : state.messages,
    })),

  closeChat: () => set({ isOpen: false }),

  addUserMessage: (content) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { id: crypto.randomUUID(), role: "user", content, diff: null, pendingDocument: null, accepted: null },
      ],
    })),

  addAssistantMessage: (response) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: response.messageId,
          role: "assistant",
          content: response.content,
          diff: response.diff,
          pendingDocument: response.pendingDocument,
          accepted: null,
        },
      ],
    })),

  acceptDiff: (messageId) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, accepted: true } : m
      ),
    })),

  rejectDiff: (messageId) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, accepted: false } : m
      ),
    })),

  setLoading: (loading) => set({ isLoading: loading }),
});
```

- [ ] **Step 2: useAIChatStore 생성**

`apps/web/src/features/ai/store/useAIChatStore.ts`:
```typescript
import { create } from "zustand";
import { createAiChatSlice } from "./aiChatSlice";
import type { AiChatSlice } from "./aiChatSlice";

export const useAIChatStore = create<AiChatSlice>()((...a) => ({
  ...createAiChatSlice(...a),
}));
```

- [ ] **Step 3: 빌드 확인**

```bash
cd apps/web && pnpm build
```

Expected: 타입 에러 없음

---

## Task 9: 프론트엔드 — API 클라이언트

**Files:**
- Create: `apps/web/src/features/ai/api/ai.api.ts`

- [ ] **Step 1: ai.api.ts 생성**

`apps/web/src/features/ai/api/ai.api.ts`:
```typescript
import { httpClient } from "@/shared/api/httpClient";
import type { AiChatResponse, ColumnSuggestion, OrgAiSettings } from "@erdify/contracts";

export const sendAiChat = (diagramId: string, message: string): Promise<AiChatResponse> =>
  httpClient.post<AiChatResponse>("/ai/chat", { diagramId, message }).then((r) => r.data);

export const acceptAiDiff = (messageId: string): Promise<void> =>
  httpClient.post(`/ai/chat/${messageId}/accept`).then(() => undefined);

export const rejectAiDiff = (messageId: string): Promise<void> =>
  httpClient.post(`/ai/chat/${messageId}/reject`).then(() => undefined);

export const suggestColumns = (
  tableName: string,
  existingColumns: string[],
): Promise<ColumnSuggestion[]> =>
  httpClient
    .post<ColumnSuggestion[]>("/ai/suggest-columns", { tableName, existingColumns })
    .then((r) => r.data);

export const getOrgAiSettings = (orgId: string): Promise<OrgAiSettings> =>
  httpClient.get<OrgAiSettings>(`/organizations/${orgId}/ai-settings`).then((r) => r.data);

export const updateOrgAiSettings = (orgId: string, apiKey: string): Promise<void> =>
  httpClient.put(`/organizations/${orgId}/ai-settings`, { apiKey }).then(() => undefined);
```

---

## Task 10: 프론트엔드 — DiffCard 컴포넌트

**Files:**
- Create: `apps/web/src/features/ai/components/DiffCard.tsx`

- [ ] **Step 1: DiffCard 작성**

`apps/web/src/features/ai/components/DiffCard.tsx`:
```tsx
import { useState } from "react";
import type { DiffChange } from "@erdify/contracts";

interface DiffCardProps {
  messageId: string;
  diff: DiffChange[];
  accepted: boolean | null;
  onAccept: (messageId: string) => void;
  onReject: (messageId: string) => void;
}

const DIFF_LABELS: Record<string, (d: DiffChange) => string> = {
  addTable: (d) => `+ 테이블 추가: ${(d as { tableName: string }).tableName}`,
  removeTable: (d) => `- 테이블 삭제: ${(d as { tableName: string }).tableName}`,
  updateTable: (d) => `~ 테이블 이름 변경: ${(d as { oldName: string; newName: string }).oldName} → ${(d as { oldName: string; newName: string }).newName}`,
  addColumn: (d) => `+ 컬럼 추가: ${(d as { tableName: string; columnName: string; columnType: string }).tableName}.${(d as { columnName: string }).columnName} (${(d as { columnType: string }).columnType})`,
  removeColumn: (d) => `- 컬럼 삭제: ${(d as { tableName: string; columnName: string }).tableName}.${(d as { columnName: string }).columnName}`,
  updateColumn: (d) => {
    const dd = d as { tableName: string; columnName: string; changes: string[] };
    return `~ 컬럼 수정: ${dd.tableName}.${dd.columnName} (${dd.changes.join(", ")})`;
  },
  addRelation: (d) => `+ 관계 추가: ${(d as { fromTable: string; toTable: string; cardinality: string }).fromTable} → ${(d as { toTable: string }).toTable} (${(d as { cardinality: string }).cardinality})`,
  removeRelation: (d) => `- 관계 삭제: ${(d as { fromTable: string; toTable: string }).fromTable} → ${(d as { toTable: string }).toTable}`,
};

export const DiffCard = ({ messageId, diff, accepted, onAccept, onReject }: DiffCardProps) => {
  const [expanded, setExpanded] = useState(false);

  const summary = `${diff.length}개 변경사항`;

  if (accepted === true) {
    return (
      <div style={{ padding: "8px 12px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #86efac", fontSize: 13, color: "#16a34a" }}>
        ✓ 변경사항 적용됨
      </div>
    );
  }

  if (accepted === false) {
    return (
      <div style={{ padding: "8px 12px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fca5a5", fontSize: 13, color: "#dc2626" }}>
        ✗ 변경사항 거절됨
      </div>
    );
  }

  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden", marginTop: 8 }}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{ width: "100%", padding: "8px 12px", background: "#f8fafc", border: "none", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 500 }}
      >
        <span>📋 {summary}</span>
        <span>{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <ul style={{ margin: 0, padding: "8px 12px 8px 24px", listStyle: "none", fontSize: 12, lineHeight: 1.8, background: "#ffffff" }}>
          {diff.map((change, i) => (
            <li key={i} style={{ color: change.type.startsWith("add") ? "#16a34a" : change.type.startsWith("remove") ? "#dc2626" : "#d97706" }}>
              {(DIFF_LABELS[change.type] ?? ((d) => d.type))(change)}
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: "flex", gap: 8, padding: "8px 12px", borderTop: "1px solid #e2e8f0", background: "#ffffff" }}>
        <button
          type="button"
          onClick={() => onAccept(messageId)}
          style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: "none", background: "#2563eb", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 500 }}
        >
          수락
        </button>
        <button
          type="button"
          onClick={() => onReject(messageId)}
          style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: "#374151", cursor: "pointer", fontSize: 13 }}
        >
          거절
        </button>
      </div>
    </div>
  );
};
```

---

## Task 11: 프론트엔드 — FloatingAIChat 컴포넌트

**Files:**
- Create: `apps/web/src/features/ai/components/MessageBubble.tsx`
- Create: `apps/web/src/features/ai/components/AIChatFAB.tsx`
- Create: `apps/web/src/features/ai/components/AIChatWindow.tsx`
- Create: `apps/web/src/features/ai/components/FloatingAIChat.tsx`

- [ ] **Step 1: MessageBubble 생성**

`apps/web/src/features/ai/components/MessageBubble.tsx`:
```tsx
import type { AiMessage } from "../store/aiChatSlice";
import { DiffCard } from "./DiffCard";

interface MessageBubbleProps {
  message: AiMessage;
  onAccept: (messageId: string) => void;
  onReject: (messageId: string) => void;
}

export const MessageBubble = ({ message, onAccept, onReject }: MessageBubbleProps) => {
  const isUser = message.role === "user";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start", marginBottom: 12 }}>
      <div
        style={{
          maxWidth: "80%",
          padding: "8px 12px",
          borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
          background: isUser ? "#2563eb" : "#f1f5f9",
          color: isUser ? "#fff" : "#1e293b",
          fontSize: 14,
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {message.content}
      </div>
      {message.diff && (
        <div style={{ width: "80%", marginTop: 4 }}>
          <DiffCard
            messageId={message.id}
            diff={message.diff}
            accepted={message.accepted}
            onAccept={onAccept}
            onReject={onReject}
          />
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: AIChatFAB 생성**

`apps/web/src/features/ai/components/AIChatFAB.tsx`:
```tsx
interface AIChatFABProps {
  onClick: () => void;
}

export const AIChatFAB = ({ onClick }: AIChatFABProps) => (
  <button
    type="button"
    onClick={onClick}
    title="AI 어시스턴트"
    style={{
      position: "fixed",
      bottom: 24,
      right: 24,
      width: 52,
      height: 52,
      borderRadius: "50%",
      background: "#2563eb",
      color: "#fff",
      border: "none",
      cursor: "pointer",
      fontSize: 22,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 4px 16px rgba(37,99,235,0.4)",
      zIndex: 1000,
    }}
  >
    ✦
  </button>
);
```

- [ ] **Step 3: AIChatWindow 생성**

`apps/web/src/features/ai/components/AIChatWindow.tsx`:
```tsx
import { useRef, useEffect, useState } from "react";
import type { AiMessage } from "../store/aiChatSlice";
import { MessageBubble } from "./MessageBubble";

interface AIChatWindowProps {
  messages: AiMessage[];
  isLoading: boolean;
  onClose: () => void;
  onSend: (message: string) => void;
  onAccept: (messageId: string) => void;
  onReject: (messageId: string) => void;
}

export const AIChatWindow = ({ messages, isLoading, onClose, onSend, onAccept, onReject }: AIChatWindowProps) => {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 88,
        right: 24,
        width: 360,
        height: 480,
        borderRadius: 16,
        background: "#ffffff",
        boxShadow: "0 8px 32px rgba(0,0,0,0.16)",
        display: "flex",
        flexDirection: "column",
        zIndex: 1000,
        overflow: "hidden",
      }}
    >
      {/* 헤더 */}
      <div style={{ padding: "12px 16px", background: "#2563eb", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 600, fontSize: 15 }}>✦ ERDify AI</span>
        <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
      </div>

      {/* 메시지 목록 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 12px" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 14, marginTop: 40 }}>
            ERD에 대해 무엇이든 물어보세요.<br />
            <span style={{ fontSize: 12 }}>"orders 테이블 추가해줘" 같은 명령도 가능해요.</span>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onAccept={onAccept} onReject={onReject} />
        ))}
        {isLoading && (
          <div style={{ color: "#94a3b8", fontSize: 13, padding: "4px 0" }}>AI가 생각 중...</div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div style={{ padding: "8px 12px", borderTop: "1px solid #e2e8f0", display: "flex", gap: 8, alignItems: "flex-end" }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지 입력 (Enter 전송, Shift+Enter 줄바꿈)"
          rows={2}
          style={{ flex: 1, resize: "none", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 10px", fontSize: 13, outline: "none", fontFamily: "inherit" }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          style={{ padding: "8px 14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500, opacity: isLoading || !input.trim() ? 0.5 : 1 }}
        >
          전송
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: FloatingAIChat 생성 (FAB + Window 조합)**

`apps/web/src/features/ai/components/FloatingAIChat.tsx`:
```tsx
import { useAIChatStore } from "../store/useAIChatStore";
import { AIChatFAB } from "./AIChatFAB";
import { AIChatWindow } from "./AIChatWindow";
import { sendAiChat, acceptAiDiff, rejectAiDiff } from "../api/ai.api";

interface FloatingAIChatProps {
  diagramId: string;
}

export const FloatingAIChat = ({ diagramId }: FloatingAIChatProps) => {
  const { isOpen, messages, isLoading, openChat, closeChat, addUserMessage, addAssistantMessage, acceptDiff, rejectDiff, setLoading } = useAIChatStore();

  const handleSend = async (message: string) => {
    addUserMessage(message);
    setLoading(true);
    try {
      const response = await sendAiChat(diagramId, message);
      addAssistantMessage(response);
    } catch {
      addAssistantMessage({ messageId: crypto.randomUUID(), content: "오류가 발생했습니다. 다시 시도해주세요.", diff: null, pendingDocument: null });
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg?.pendingDocument) return;
    acceptDiff(messageId);
    await acceptAiDiff(messageId).catch(() => {});
    // pendingDocument를 editor에 적용: 부모에서 applyCommand를 쓰는 대신
    // useEditorStore를 여기서 직접 임포트해 applyCommand로 교체
    // (EditorPage에서 document를 세팅하는 방식과 동일하게 setDocument 사용)
    const { setDocument } = await import("@/features/editor/store/useEditorStore").then((m) => m.useEditorStore.getState());
    setDocument(msg.pendingDocument);
  };

  const handleReject = async (messageId: string) => {
    rejectDiff(messageId);
    await rejectAiDiff(messageId).catch(() => {});
  };

  return (
    <>
      {!isOpen && <AIChatFAB onClick={() => openChat()} />}
      {isOpen && (
        <AIChatWindow
          messages={messages}
          isLoading={isLoading}
          onClose={closeChat}
          onSend={handleSend}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      )}
    </>
  );
};
```

- [ ] **Step 5: 빌드 확인**

```bash
cd apps/web && pnpm build
```

Expected: 타입 에러 없음

---

## Task 12: 에디터 통합 — FloatingAIChat 마운트 + 미니맵 연동

**Files:**
- Modify: `apps/web/src/features/editor/pages/EditorPage.tsx`
- Modify: `apps/web/src/features/editor/components/EditorCanvas.tsx`

- [ ] **Step 1: EditorCanvas에 `hideMinimap` prop 추가**

`apps/web/src/features/editor/components/EditorCanvas.tsx`를 읽고 `ClickableMiniMap` 렌더링 부분을 수정한다.

`EditorCanvas` 컴포넌트의 props 타입에 `hideMinimap?: boolean` 추가:
```tsx
// 기존 EditorCanvasProps에 추가
interface EditorCanvasProps {
  // ... 기존 props
  hideMinimap?: boolean;
}
```

`ClickableMiniMap` 렌더링 라인(392번 줄 근처)을 조건부로:
```tsx
{!hideMinimap && <ClickableMiniMap containerRef={containerRef} allSchemas={allSchemas} schemaColors={schemaColors} />}
```

- [ ] **Step 2: EditorPage에 FloatingAIChat 마운트 + 미니맵 연동**

`apps/web/src/features/editor/pages/EditorPage.tsx`에 아래 추가:

```tsx
import { FloatingAIChat } from "@/features/ai/components/FloatingAIChat";
import { useAIChatStore } from "@/features/ai/store/useAIChatStore";

// 컴포넌트 내부:
const isAIChatOpen = useAIChatStore((s) => s.isOpen);

// JSX에서 EditorCanvas에 prop 전달:
<EditorCanvas
  // ... 기존 props
  hideMinimap={isAIChatOpen}
/>

// EditorCanvas 뒤에 FloatingAIChat 추가 (diagramId가 있을 때만):
{diagramId && <FloatingAIChat diagramId={diagramId} />}
```

- [ ] **Step 3: 빌드 확인**

```bash
cd apps/web && pnpm build
```

Expected: 에러 없음

---

## Task 13: EmptyCanvas AI 버튼

**Files:**
- Modify: `apps/web/src/features/editor/components/EditorCanvas.tsx`

- [ ] **Step 1: EditorCanvas에서 테이블이 0개일 때 AI 버튼 표시**

`apps/web/src/features/editor/components/EditorCanvas.tsx`를 읽고 빈 캔버스 상태(nodes.length === 0)를 확인한다.

ReactFlow 내부 또는 Background 위에 오버레이로 다음 JSX를 조건부 렌더링한다:

```tsx
import { useAIChatStore } from "@/features/ai/store/useAIChatStore";

// 컴포넌트 내부:
const openChat = useAIChatStore((s) => s.openChat);

// nodes.length === 0 && canEdit 조건으로:
{nodes.length === 0 && canEdit && (
  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 10, textAlign: "center", pointerEvents: "none" }}>
    <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 16 }}>테이블을 추가해 ERD를 만들어보세요.</p>
    <button
      type="button"
      onClick={() => openChat("어떤 서비스의 DB를 설계할까요? 서비스 이름이나 기능을 설명해주시면 ERD를 만들어드릴게요.")}
      style={{ pointerEvents: "auto", padding: "10px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 500 }}
    >
      ✦ AI로 ERD 생성하기
    </button>
  </div>
)}
```

- [ ] **Step 2: 빌드 확인**

```bash
cd apps/web && pnpm build
```

Expected: 에러 없음

---

## Task 14: 인라인 컬럼 추천 (EditableTableNode)

**Files:**
- Modify: `apps/web/src/features/editor/components/EditableTableNode/index.tsx`

- [ ] **Step 1: EditableTableNode/index.tsx 파일 읽기**

파일을 읽어 컬럼명 입력 부분(`IMEInput` 또는 input)을 파악한다.

- [ ] **Step 2: 인라인 추천 로직 추가**

컬럼 이름 입력 필드에 `onColumnNameChange` 핸들러를 추가한다. 기존 컴포넌트 내부에 아래 훅을 추가:

```tsx
import { useState, useEffect, useRef } from "react";
import { suggestColumns } from "@/features/ai/api/ai.api";
import type { ColumnSuggestion } from "@erdify/contracts";

// 컴포넌트 내부 (기존 state와 함께):
const [suggestions, setSuggestions] = useState<ColumnSuggestion[]>([]);
const [activeSuggestionField, setActiveSuggestionField] = useState<string | null>(null);
const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const handleColumnNameInput = (columnId: string, value: string, tableName: string, existingColumnNames: string[]) => {
  if (debounceRef.current) clearTimeout(debounceRef.current);
  if (value.length < 2) {
    setSuggestions([]);
    return;
  }
  setActiveSuggestionField(columnId);
  debounceRef.current = setTimeout(() => {
    suggestColumns(tableName, existingColumnNames).then((results) => {
      setSuggestions(results.filter((r) => r.name.startsWith(value)));
    }).catch(() => setSuggestions([]));
  }, 300);
};
```

컬럼명 입력 필드 아래에 추천 드롭다운:
```tsx
{activeSuggestionField === column.id && suggestions.length > 0 && (
  <ul style={{ position: "absolute", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, zIndex: 100, margin: 0, padding: "4px 0", listStyle: "none", minWidth: 200, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
    {suggestions.map((s) => (
      <li
        key={s.name}
        onMouseDown={() => {
          // 컬럼명 및 타입 자동완성 — applyCommand 사용
          applyCommand((doc) => updateColumn(doc, entity.id, column.id, { name: s.name, type: s.type, nullable: s.nullable, primaryKey: s.pk }));
          setSuggestions([]);
          setActiveSuggestionField(null);
        }}
        style={{ padding: "6px 12px", cursor: "pointer", fontSize: 13 }}
      >
        <strong>{s.name}</strong> <span style={{ color: "#94a3b8" }}>{s.type}</span>{s.pk && <span style={{ color: "#2563eb", marginLeft: 4 }}>PK</span>}
      </li>
    ))}
  </ul>
)}
```

- [ ] **Step 3: 빌드 확인**

```bash
cd apps/web && pnpm build
```

Expected: 에러 없음

---

## Task 15: 조직 AI 설정 UI (AISettingsPanel)

**Files:**
- Create: `apps/web/src/features/dashboard/pages/AISettingsPanel.tsx`

- [ ] **Step 1: AISettingsPanel 생성**

`apps/web/src/features/dashboard/pages/AISettingsPanel.tsx`:
```tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOrgAiSettings, updateOrgAiSettings } from "@/features/ai/api/ai.api";

interface AISettingsPanelProps {
  orgId: string;
  isOwner: boolean;
}

export const AISettingsPanel = ({ orgId, isOwner }: AISettingsPanelProps) => {
  const [apiKey, setApiKey] = useState("");
  const [showInput, setShowInput] = useState(false);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["org-ai-settings", orgId],
    queryFn: () => getOrgAiSettings(orgId),
  });

  const mutation = useMutation({
    mutationFn: (key: string) => updateOrgAiSettings(orgId, key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-ai-settings", orgId] });
      setApiKey("");
      setShowInput(false);
    },
  });

  const handleSave = () => {
    if (!apiKey.trim()) return;
    mutation.mutate(apiKey.trim());
  };

  return (
    <section style={{ padding: "24px 0" }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>AI 설정</h3>
      <p style={{ fontSize: 14, color: "#64748b", marginBottom: 16 }}>
        ERDify AI 기능을 사용하려면 Anthropic API 키가 필요합니다.
        키는 암호화되어 저장되며 AI 요청에만 사용됩니다.
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 14 }}>API 키 상태:</span>
        {data?.hasApiKey ? (
          <span style={{ fontSize: 13, color: "#16a34a", fontWeight: 500 }}>✓ 설정됨</span>
        ) : (
          <span style={{ fontSize: 13, color: "#dc2626" }}>미설정</span>
        )}
      </div>

      {isOwner && (
        <>
          {!showInput ? (
            <button
              type="button"
              onClick={() => setShowInput(true)}
              style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 13 }}
            >
              {data?.hasApiKey ? "API 키 변경" : "API 키 설정"}
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
                style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13, width: 300, outline: "none" }}
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={mutation.isPending || !apiKey.trim()}
                style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#2563eb", color: "#fff", cursor: "pointer", fontSize: 13, opacity: mutation.isPending ? 0.5 : 1 }}
              >
                {mutation.isPending ? "저장 중..." : "저장"}
              </button>
              <button
                type="button"
                onClick={() => { setShowInput(false); setApiKey(""); }}
                style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 13 }}
              >
                취소
              </button>
            </div>
          )}
          {mutation.isError && (
            <p style={{ color: "#dc2626", fontSize: 13, marginTop: 8 }}>저장에 실패했습니다. API 키를 확인해주세요.</p>
          )}
        </>
      )}

      {!isOwner && (
        <p style={{ fontSize: 13, color: "#64748b" }}>API 키 설정은 조직 소유자만 가능합니다.</p>
      )}
    </section>
  );
};
```

- [ ] **Step 2: MemberManagementPage 또는 적절한 설정 페이지에 AISettingsPanel 추가**

`apps/web/src/features/dashboard/pages/MemberManagementPage.tsx`를 읽고 구조를 파악한 다음,
페이지 하단에 `AISettingsPanel`을 추가한다:

```tsx
import { AISettingsPanel } from "./AISettingsPanel";

// JSX 내부:
<AISettingsPanel orgId={orgId} isOwner={myRole === "owner"} />
```

- [ ] **Step 3: 전체 빌드 확인**

```bash
cd /경로/ERDify && pnpm build
```

Expected: 모든 패키지 에러 없이 빌드 완료

---

## 자체 검토 (Spec Coverage)

| 스펙 요구사항 | 구현 Task |
|---|---|
| 조직 단위 Claude API 키 관리 (암호화 저장) | Task 1, 6, 15 |
| POST /ai/chat — Tool Use로 ERD 수정 | Task 3, 5, 6 |
| POST /ai/suggest-columns — 컬럼 추천 | Task 3, 6 |
| GET/PUT /organizations/:id/ai-settings | Task 3, 6 |
| ai_conversations 테이블 (3개월 TTL) | Task 1, 4 |
| organization_ai_settings 테이블 | Task 1 |
| DiffChange 타입 + AiChatResponse 타입 | Task 2 |
| FloatingAIChat (채널톡 스타일, 우하단) | Task 11 |
| 채팅 열리면 미니맵 숨김 | Task 12 |
| Diff 카드 (수락/거절) + 아코디언 | Task 10, 11 |
| 수락 시 DiagramDocument 에디터 반영 | Task 11 (handleAccept) |
| EmptyCanvas AI 생성 버튼 | Task 13 |
| TableEditor 인라인 컬럼 추천 (300ms debounce) | Task 14 |
| Zustand store 분리 (aiChatStore ≠ diagramStore) | Task 8 |
| 조직 AI 설정 UI (owner만 수정 가능) | Task 15 |
| 일일 TTL 정리 스케줄러 | Task 4 |
