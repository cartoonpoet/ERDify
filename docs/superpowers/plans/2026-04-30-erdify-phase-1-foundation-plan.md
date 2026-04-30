# ERDify Phase 1 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ERDify의 Turborepo 기반 모노레포, React/Vite 프론트, NestJS API, TypeORM/PostgreSQL 설정, LDS 연동, 공통 TypeScript/테스트 품질 게이트를 만든다.

**Architecture:** 이 계획은 승인된 MVP 설계 중 Phase 1만 구현한다. 저장 가능한 제품 기능은 아직 만들지 않고, 이후 인증/ERD 편집기/협업/import-export 작업이 올라갈 수 있는 앱과 패키지 경계를 먼저 고정한다.

**Tech Stack:** pnpm 10.32.1, Turborepo, TypeScript, React 18.2, Vite, NestJS, TypeORM, PostgreSQL, LDS `@lawkit/ui`, vanilla-extract, TanStack Query, Axios, Zustand, Vitest.

---

## 범위 확인

승인된 설계 문서는 MVP 전체를 다룬다. 이 구현 계획은 너무 큰 MVP를 한 번에 실행하지 않고, 첫 번째 독립 작업 단위인 **모노레포/기초 앱/공통 컨벤션**만 다룬다.

다음 계획으로 분리할 작업:

- Phase 2: Auth, organization, project, role
- Phase 3: ERD domain/editor
- Phase 4: persistence/version
- Phase 5: Yjs real-time collaboration
- Phase 6: import/export
- Phase 7: AI/MCP/proposal
- Phase 8: share/operation polish

## 생성/수정 파일 구조

```text
package.json                         # 루트 workspace scripts와 공통 dev dependencies
pnpm-workspace.yaml                  # apps/*, packages/* workspace 등록
turbo.json                           # build/lint/typecheck/test task graph
.gitignore                           # Node, build, env 산출물 제외
.editorconfig                        # 기본 편집 컨벤션
.env.example                         # API/PostgreSQL 기본 환경 변수 예시
README.md                            # 로컬 실행/품질 게이트 문서

scripts/
  verify-workspace.ps1               # 루트 구조 smoke check
  verify-config-packages.ps1         # 공통 config package smoke check

packages/
  config-typescript/                 # 공유 tsconfig 패키지
  config-eslint/                     # 공유 ESLint flat config 패키지
  domain/                            # canonical ERD 문서 타입/검증 최소 골격
  contracts/                         # API 계약 Zod schema 최소 골격
  db/                                # TypeORM 옵션/마이그레이션 위치
  erd-ui/                            # ERD 전용 UI 패키지 최소 export

apps/
  web/                               # React/Vite 앱, LDS/TanStack Query/Axios/Zustand 연결
  api/                               # NestJS 앱, health endpoint, TypeORM 설정 연결
```

## Task 1: 루트 workspace와 smoke verifier 만들기

**Files:**

- Create: `scripts/verify-workspace.ps1`
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `.gitignore`
- Create: `.editorconfig`
- Create: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: 실패하는 workspace smoke verifier 작성**

Create `scripts/verify-workspace.ps1`:

```powershell
$ErrorActionPreference = "Stop"

$requiredPaths = @(
  "package.json",
  "pnpm-workspace.yaml",
  "turbo.json",
  ".editorconfig",
  ".env.example",
  "apps/web",
  "apps/api",
  "packages/domain",
  "packages/contracts",
  "packages/db",
  "packages/erd-ui",
  "packages/config-eslint",
  "packages/config-typescript"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path -Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing workspace paths: " + ($missing -join ", "))
}

$package = Get-Content -Raw -Path "package.json" | ConvertFrom-Json
if ($package.packageManager -ne "pnpm@10.32.1") {
  Write-Error "packageManager must be pnpm@10.32.1"
}

Write-Host "Workspace structure is valid."
```

- [ ] **Step 2: verifier가 실패하는지 확인**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify-workspace.ps1
```

Expected:

```text
Missing workspace paths:
```

- [ ] **Step 3: 루트 workspace 파일 작성**

Create `package.json`:

```json
{
  "name": "erdify",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "packageManager": "pnpm@10.32.1",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "verify:workspace": "powershell -ExecutionPolicy Bypass -File scripts/verify-workspace.ps1",
    "verify:configs": "powershell -ExecutionPolicy Bypass -File scripts/verify-config-packages.ps1"
  },
  "devDependencies": {
    "@eslint/js": "^9.25.1",
    "@types/node": "^22.15.3",
    "@typescript-eslint/eslint-plugin": "^8.31.0",
    "@typescript-eslint/parser": "^8.31.0",
    "eslint": "^9.25.1",
    "eslint-config-prettier": "^10.1.2",
    "eslint-plugin-react-hooks": "^5.2.0",
    "globals": "^16.0.0",
    "prettier": "^3.5.3",
    "turbo": "^2.5.2",
    "typescript": "^5.8.3",
    "vitest": "^3.1.2"
  }
}
```

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Create `turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "build/**", ".vite/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "test": {
      "dependsOn": ["^test"],
      "outputs": ["coverage/**"]
    }
  }
}
```

Create `.gitignore`:

```gitignore
node_modules/
dist/
build/
coverage/
.turbo/
.vite/
.env
.env.*
!.env.example
*.log
```

Create `.editorconfig`:

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

Create `.env.example`:

```dotenv
NODE_ENV=development
API_PORT=4000
WEB_PORT=5173
DATABASE_URL=postgres://erdify:erdify@localhost:5432/erdify
JWT_SECRET=replace-with-local-development-secret
```

Create directories:

```powershell
New-Item -ItemType Directory -Force -Path apps/web, apps/api, packages/domain, packages/contracts, packages/db, packages/erd-ui, packages/config-eslint, packages/config-typescript
```

Create `README.md`:

````markdown
# ERDify

ERDify is a TypeScript monorepo for a web-based ERD editor.

## Stack

- Turborepo
- React + Vite
- NestJS
- TypeORM + PostgreSQL
- LDS `@lawkit/ui`
- TanStack Query, Axios, Zustand, vanilla-extract

## Local Commands

```powershell
pnpm install
pnpm verify:workspace
pnpm verify:configs
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Apps

- `apps/web`: React/Vite frontend
- `apps/api`: NestJS backend

## Packages

- `packages/domain`: canonical ERD document model
- `packages/contracts`: API contract schemas
- `packages/db`: TypeORM config and migrations
- `packages/erd-ui`: ERD-specific UI primitives
````

- [ ] **Step 4: workspace verifier 통과 확인**

Run:

```powershell
pnpm verify:workspace
```

Expected:

```text
Workspace structure is valid.
```

- [ ] **Step 5: 의존성 설치**

Run:

```powershell
pnpm install
```

Expected:

```text
Done in
```

- [ ] **Step 6: 커밋**

```powershell
git add package.json pnpm-workspace.yaml turbo.json .gitignore .editorconfig .env.example README.md scripts/verify-workspace.ps1
git commit -m "chore: initialize turborepo workspace"
```

## Task 2: 공유 TypeScript/ESLint config 패키지 만들기

**Files:**

- Create: `scripts/verify-config-packages.ps1`
- Create: `packages/config-typescript/package.json`
- Create: `packages/config-typescript/base.json`
- Create: `packages/config-typescript/react.json`
- Create: `packages/config-typescript/nest.json`
- Create: `packages/config-typescript/node.json`
- Create: `packages/config-eslint/package.json`
- Create: `packages/config-eslint/base.js`
- Create: `packages/config-eslint/react.js`
- Create: `packages/config-eslint/nest.js`
- Create: `eslint.config.js`

- [ ] **Step 1: 실패하는 config verifier 작성**

Create `scripts/verify-config-packages.ps1`:

```powershell
$ErrorActionPreference = "Stop"

$requiredFiles = @(
  "packages/config-typescript/package.json",
  "packages/config-typescript/base.json",
  "packages/config-typescript/react.json",
  "packages/config-typescript/nest.json",
  "packages/config-typescript/node.json",
  "packages/config-eslint/package.json",
  "packages/config-eslint/base.js",
  "packages/config-eslint/react.js",
  "packages/config-eslint/nest.js",
  "eslint.config.js"
)

$missing = @()
foreach ($file in $requiredFiles) {
  if (-not (Test-Path -Path $file)) {
    $missing += $file
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing config files: " + ($missing -join ", "))
}

Get-Content -Raw -Path "packages/config-typescript/base.json" | ConvertFrom-Json | Out-Null
Get-Content -Raw -Path "packages/config-typescript/react.json" | ConvertFrom-Json | Out-Null
Get-Content -Raw -Path "packages/config-typescript/nest.json" | ConvertFrom-Json | Out-Null
Get-Content -Raw -Path "packages/config-typescript/node.json" | ConvertFrom-Json | Out-Null

Write-Host "Config packages are valid."
```

- [ ] **Step 2: verifier가 실패하는지 확인**

Run:

```powershell
pnpm verify:configs
```

Expected:

```text
Missing config files:
```

- [ ] **Step 3: TypeScript config 패키지 작성**

Create `packages/config-typescript/package.json`:

```json
{
  "name": "@erdify/config-typescript",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "files": ["base.json", "react.json", "nest.json", "node.json"]
}
```

Create `packages/config-typescript/base.json`:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

Create `packages/config-typescript/react.json`:

```json
{
  "extends": "./base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client", "vitest/globals"]
  }
}
```

Create `packages/config-typescript/nest.json`:

```json
{
  "extends": "./base.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "Node",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "outDir": "dist",
    "types": ["node"]
  }
}
```

Create `packages/config-typescript/node.json`:

```json
{
  "extends": "./base.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "types": ["node", "vitest/globals"]
  }
}
```

- [ ] **Step 4: ESLint config 패키지 작성**

Create `packages/config-eslint/package.json`:

```json
{
  "name": "@erdify/config-eslint",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "exports": {
    "./base": "./base.js",
    "./react": "./react.js",
    "./nest": "./nest.js"
  }
}
```

Create `packages/config-eslint/base.js`:

```js
import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettier from "eslint-config-prettier";

export default [
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: "module"
      }
    },
    plugins: {
      "@typescript-eslint": tseslint
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error"
    }
  },
  prettier
];
```

Create `packages/config-eslint/react.js`:

```js
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import base from "./base.js";

export default [
  ...base,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser
      }
    },
    plugins: {
      "react-hooks": reactHooks
    },
    rules: {
      ...reactHooks.configs.recommended.rules
    }
  }
];
```

Create `packages/config-eslint/nest.js`:

```js
import globals from "globals";
import base from "./base.js";

export default [
  ...base,
  {
    files: ["**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node
      }
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "off"
    }
  }
];
```

Create root `eslint.config.js`:

```js
import base from "./packages/config-eslint/base.js";

export default base;
```

- [ ] **Step 5: config verifier 통과 확인**

Run:

```powershell
pnpm verify:configs
```

Expected:

```text
Config packages are valid.
```

- [ ] **Step 6: 커밋**

```powershell
git add scripts/verify-config-packages.ps1 packages/config-typescript packages/config-eslint eslint.config.js
git commit -m "chore: add shared config packages"
```

## Task 3: domain 패키지에 canonical ERD 문서 최소 모델 만들기

**Files:**

- Create: `packages/domain/package.json`
- Create: `packages/domain/tsconfig.json`
- Create: `packages/domain/vitest.config.ts`
- Create: `packages/domain/src/types/diagram.type.ts`
- Create: `packages/domain/src/types/index.ts`
- Create: `packages/domain/src/schema/create-empty-diagram.ts`
- Create: `packages/domain/src/validation/validate-diagram.ts`
- Create: `packages/domain/src/validation/validate-diagram.test.ts`
- Create: `packages/domain/src/index.ts`

- [ ] **Step 1: 실패하는 domain 테스트 작성**

Create `packages/domain/src/validation/validate-diagram.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createEmptyDiagram, validateDiagram } from "../index";

describe("canonical ERD document", () => {
  it("creates a valid empty PostgreSQL diagram", () => {
    const diagram = createEmptyDiagram({
      id: "diagram_1",
      name: "Legal ERD",
      dialect: "postgresql"
    });

    expect(validateDiagram(diagram)).toEqual({ valid: true, errors: [] });
    expect(diagram.format).toBe("erdify.schema.v1");
    expect(diagram.entities).toEqual([]);
    expect(diagram.metadata.stableObjectIds).toBe(true);
  });

  it("rejects a relationship that references a missing entity", () => {
    const diagram = createEmptyDiagram({
      id: "diagram_1",
      name: "Legal ERD",
      dialect: "mysql"
    });

    diagram.relationships.push({
      id: "rel_missing",
      name: "fk_missing",
      sourceEntityId: "ent_missing",
      sourceColumnIds: ["col_missing"],
      targetEntityId: "ent_target",
      targetColumnIds: ["col_target"],
      cardinality: "many-to-one",
      onDelete: "restrict",
      onUpdate: "cascade"
    });

    expect(validateDiagram(diagram)).toEqual({
      valid: false,
      errors: [
        "Relationship rel_missing references missing source entity ent_missing.",
        "Relationship rel_missing references missing target entity ent_target."
      ]
    });
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run:

```powershell
pnpm --filter @erdify/domain test
```

Expected:

```text
No projects matched the filters
```

- [ ] **Step 3: domain 패키지 설정 작성**

Create `packages/domain/package.json`:

```json
{
  "name": "@erdify/domain",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "lint": "eslint src",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  },
  "devDependencies": {
    "@erdify/config-typescript": "workspace:*",
    "vitest": "^3.1.2"
  }
}
```

Create `packages/domain/tsconfig.json`:

```json
{
  "extends": "@erdify/config-typescript/node.json",
  "compilerOptions": {
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

Create `packages/domain/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node"
  }
});
```

- [ ] **Step 4: domain 타입과 구현 작성**

Create `packages/domain/src/types/diagram.type.ts`:

```ts
export type DiagramDialect = "postgresql" | "mysql" | "mariadb";

export type RelationshipCardinality = "one-to-one" | "one-to-many" | "many-to-one";

export type ReferentialAction = "cascade" | "restrict" | "set-null" | "no-action";

export interface DiagramColumn {
  id: string;
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  unique: boolean;
  defaultValue: string | null;
  comment: string | null;
  ordinal: number;
}

export interface DiagramEntity {
  id: string;
  name: string;
  logicalName: string | null;
  comment: string | null;
  columns: DiagramColumn[];
}

export interface DiagramRelationship {
  id: string;
  name: string;
  sourceEntityId: string;
  sourceColumnIds: string[];
  targetEntityId: string;
  targetColumnIds: string[];
  cardinality: RelationshipCardinality;
  onDelete: ReferentialAction;
  onUpdate: ReferentialAction;
}

export interface DiagramMetadata {
  revision: number;
  stableObjectIds: true;
  createdAt: string;
  updatedAt: string;
}

export interface DiagramDocument {
  format: "erdify.schema.v1";
  id: string;
  name: string;
  dialect: DiagramDialect;
  entities: DiagramEntity[];
  relationships: DiagramRelationship[];
  indexes: [];
  views: [];
  metadata: DiagramMetadata;
}

export interface DiagramValidationResult {
  valid: boolean;
  errors: string[];
}
```

Create `packages/domain/src/types/index.ts`:

```ts
export type {
  DiagramColumn,
  DiagramDialect,
  DiagramDocument,
  DiagramEntity,
  DiagramMetadata,
  DiagramRelationship,
  DiagramValidationResult,
  ReferentialAction,
  RelationshipCardinality
} from "./diagram.type";
```

Create `packages/domain/src/schema/create-empty-diagram.ts`:

```ts
import type { DiagramDialect, DiagramDocument } from "../types";

interface CreateEmptyDiagramInput {
  id: string;
  name: string;
  dialect: DiagramDialect;
}

export function createEmptyDiagram(input: CreateEmptyDiagramInput): DiagramDocument {
  const now = new Date().toISOString();

  return {
    format: "erdify.schema.v1",
    id: input.id,
    name: input.name,
    dialect: input.dialect,
    entities: [],
    relationships: [],
    indexes: [],
    views: [],
    metadata: {
      revision: 1,
      stableObjectIds: true,
      createdAt: now,
      updatedAt: now
    }
  };
}
```

Create `packages/domain/src/validation/validate-diagram.ts`:

```ts
import type { DiagramDocument, DiagramValidationResult } from "../types";

export function validateDiagram(diagram: DiagramDocument): DiagramValidationResult {
  const errors: string[] = [];
  const entityIds = new Set(diagram.entities.map((entity) => entity.id));

  if (diagram.format !== "erdify.schema.v1") {
    errors.push("Diagram format must be erdify.schema.v1.");
  }

  for (const relationship of diagram.relationships) {
    if (!entityIds.has(relationship.sourceEntityId)) {
      errors.push(
        `Relationship ${relationship.id} references missing source entity ${relationship.sourceEntityId}.`
      );
    }

    if (!entityIds.has(relationship.targetEntityId)) {
      errors.push(
        `Relationship ${relationship.id} references missing target entity ${relationship.targetEntityId}.`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

Create `packages/domain/src/index.ts`:

```ts
export { createEmptyDiagram } from "./schema/create-empty-diagram";
export { validateDiagram } from "./validation/validate-diagram";
export type {
  DiagramColumn,
  DiagramDialect,
  DiagramDocument,
  DiagramEntity,
  DiagramMetadata,
  DiagramRelationship,
  DiagramValidationResult,
  ReferentialAction,
  RelationshipCardinality
} from "./types";
```

- [ ] **Step 5: domain 테스트 통과 확인**

Run:

```powershell
pnpm install
pnpm --filter @erdify/domain test
pnpm --filter @erdify/domain typecheck
```

Expected:

```text
2 passed
```

and:

```text
exited with code 0
```

- [ ] **Step 6: 커밋**

```powershell
git add packages/domain pnpm-lock.yaml
git commit -m "feat(domain): add canonical diagram model"
```

## Task 4: contracts 패키지에 Zod 기반 API 계약 골격 만들기

**Files:**

- Create: `packages/contracts/package.json`
- Create: `packages/contracts/tsconfig.json`
- Create: `packages/contracts/vitest.config.ts`
- Create: `packages/contracts/src/diagrams/diagram-contract.schema.ts`
- Create: `packages/contracts/src/diagrams/diagram-contract.schema.test.ts`
- Create: `packages/contracts/src/index.ts`

- [ ] **Step 1: 실패하는 contract 테스트 작성**

Create `packages/contracts/src/diagrams/diagram-contract.schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createDiagramRequestSchema } from "./diagram-contract.schema";

describe("diagram contracts", () => {
  it("accepts a valid diagram create request", () => {
    const parsed = createDiagramRequestSchema.parse({
      projectId: "project_1",
      name: "Legal Standard ERD",
      dialect: "postgresql"
    });

    expect(parsed).toEqual({
      projectId: "project_1",
      name: "Legal Standard ERD",
      dialect: "postgresql"
    });
  });

  it("rejects an unsupported dialect", () => {
    const result = createDiagramRequestSchema.safeParse({
      projectId: "project_1",
      name: "Legal Standard ERD",
      dialect: "oracle"
    });

    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run:

```powershell
pnpm --filter @erdify/contracts test
```

Expected:

```text
No projects matched the filters
```

- [ ] **Step 3: contracts 패키지 작성**

Create `packages/contracts/package.json`:

```json
{
  "name": "@erdify/contracts",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "lint": "eslint src",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "zod": "^3.24.3"
  },
  "devDependencies": {
    "@erdify/config-typescript": "workspace:*",
    "vitest": "^3.1.2"
  }
}
```

Create `packages/contracts/tsconfig.json`:

```json
{
  "extends": "@erdify/config-typescript/node.json",
  "compilerOptions": {
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

Create `packages/contracts/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node"
  }
});
```

Create `packages/contracts/src/diagrams/diagram-contract.schema.ts`:

```ts
import { z } from "zod";

export const diagramDialectSchema = z.enum(["postgresql", "mysql", "mariadb"]);

export const createDiagramRequestSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(120),
  dialect: diagramDialectSchema
});

export type DiagramDialectContract = z.infer<typeof diagramDialectSchema>;
export type CreateDiagramRequest = z.infer<typeof createDiagramRequestSchema>;
```

Create `packages/contracts/src/index.ts`:

```ts
export {
  createDiagramRequestSchema,
  diagramDialectSchema,
  type CreateDiagramRequest,
  type DiagramDialectContract
} from "./diagrams/diagram-contract.schema";
```

- [ ] **Step 4: contracts 테스트 통과 확인**

Run:

```powershell
pnpm install
pnpm --filter @erdify/contracts test
pnpm --filter @erdify/contracts typecheck
```

Expected:

```text
2 passed
```

and:

```text
exited with code 0
```

- [ ] **Step 5: 커밋**

```powershell
git add packages/contracts pnpm-lock.yaml
git commit -m "feat(contracts): add diagram request schemas"
```

## Task 5: web 앱 최소 골격과 LDS/TanStack Query 연결 만들기

**Files:**

- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/app/App.tsx`
- Create: `apps/web/src/app/App.test.tsx`
- Create: `apps/web/src/app/app.css.ts`
- Create: `apps/web/src/app/providers/AppProviders.tsx`
- Create: `apps/web/src/shared/api/httpClient.ts`
- Create: `apps/web/src/shared/stores/useWorkspaceStore.ts`
- Create: `apps/web/src/shared/types/index.ts`
- Create: `apps/web/src/test/setup.ts`
- Create: `apps/web/src/vite-env.d.ts`
- Create: `apps/web/eslint.config.js`

- [ ] **Step 1: 실패하는 App 테스트 작성**

Create `apps/web/src/app/App.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the editor-first dashboard shell", () => {
    render(<App />);

    expect(screen.getByText("ERDify")).toBeInTheDocument();
    expect(screen.getByText("새 ERD")).toBeInTheDocument();
    expect(screen.getByText("프로젝트를 선택하면 ERD 목록이 표시됩니다.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run:

```powershell
pnpm --filter @erdify/web test
```

Expected:

```text
No projects matched the filters
```

- [ ] **Step 3: web package와 Vite 설정 작성**

Create `apps/web/package.json`:

```json
{
  "name": "@erdify/web",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0 --port 5173",
    "build": "tsc -p tsconfig.json && vite build",
    "lint": "eslint src",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@lawkit/ui": "^0.1.35",
    "@tanstack/react-query": "^5.74.4",
    "@vanilla-extract/css": "^1.17.1",
    "@vanilla-extract/vite-plugin": "^5.0.1",
    "axios": "^1.8.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^5.0.3"
  },
  "devDependencies": {
    "@erdify/config-eslint": "workspace:*",
    "@erdify/config-typescript": "workspace:*",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@types/react": "^18.3.20",
    "@types/react-dom": "^18.3.6",
    "@vitejs/plugin-react": "^4.4.1",
    "jsdom": "^26.1.0",
    "vite": "^6.3.4",
    "vitest": "^3.1.2"
  }
}
```

Create `apps/web/tsconfig.json`:

```json
{
  "extends": "@erdify/config-typescript/react.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src", "vite.config.ts", "vitest.config.ts"]
}
```

Create `apps/web/vite.config.ts`:

```ts
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), vanillaExtractPlugin()],
  server: {
    port: 5173
  }
});
```

Create `apps/web/vitest.config.ts`:

```ts
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), vanillaExtractPlugin()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["src/test/setup.ts"]
  }
});
```

Create `apps/web/eslint.config.js`:

```js
import react from "@erdify/config-eslint/react";

export default react;
```

Create `apps/web/index.html`:

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ERDify</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: web 앱 코드 작성**

Create `apps/web/src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

Create `apps/web/src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />
```

Create `apps/web/src/shared/api/httpClient.ts`:

```ts
import axios from "axios";

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000",
  timeout: 10_000
});
```

Create `apps/web/src/shared/stores/useWorkspaceStore.ts`:

```ts
import { create } from "zustand";

interface WorkspaceState {
  selectedOrganizationId: string | null;
  selectedProjectId: string | null;
  selectOrganization: (organizationId: string) => void;
  selectProject: (projectId: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  selectedOrganizationId: null,
  selectedProjectId: null,
  selectOrganization: (organizationId) =>
    set({
      selectedOrganizationId: organizationId,
      selectedProjectId: null
    }),
  selectProject: (projectId) =>
    set({
      selectedProjectId: projectId
    })
}));
```

Create `apps/web/src/shared/types/index.ts`:

```ts
export interface WorkspaceSummary {
  organizationCount: number;
  projectCount: number;
  diagramCount: number;
}
```

Create `apps/web/src/app/app.css.ts`:

```ts
import { style } from "@vanilla-extract/css";

export const shell = style({
  minHeight: "100vh",
  background: "#f6f8fb",
  color: "#172033"
});

export const topbar = style({
  height: "56px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 20px",
  borderBottom: "1px solid #d8dee8",
  background: "#ffffff"
});

export const brand = style({
  fontSize: 18,
  fontWeight: 700
});

export const content = style({
  display: "grid",
  gridTemplateColumns: "280px 1fr",
  minHeight: "calc(100vh - 56px)"
});

export const sidebar = style({
  borderRight: "1px solid #d8dee8",
  background: "#ffffff",
  padding: "16px"
});

export const main = style({
  padding: "24px"
});

export const emptyState = style({
  display: "flex",
  minHeight: "360px",
  alignItems: "center",
  justifyContent: "center",
  border: "1px dashed #b7c2d3",
  background: "#ffffff"
});
```

Create `apps/web/src/app/providers/AppProviders.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { useState } from "react";

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1
          }
        }
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

Create `apps/web/src/app/App.tsx`:

```tsx
import { Button, lightThemeClass } from "@lawkit/ui";
import "@lawkit/ui/style.css";
import { brand, content, emptyState, main, shell, sidebar, topbar } from "./app.css";

export function App() {
  return (
    <div className={`${lightThemeClass} ${shell}`}>
      <header className={topbar}>
        <div className={brand}>ERDify</div>
        <Button color="primary" size="medium">
          새 ERD
        </Button>
      </header>
      <div className={content}>
        <aside className={sidebar}>프로젝트</aside>
        <main className={main}>
          <section className={emptyState}>프로젝트를 선택하면 ERD 목록이 표시됩니다.</section>
        </main>
      </div>
    </div>
  );
}
```

Create `apps/web/src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import { AppProviders } from "./app/providers/AppProviders";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>
);
```

- [ ] **Step 5: web 테스트와 빌드 통과 확인**

Run:

```powershell
pnpm install
pnpm --filter @erdify/web test
pnpm --filter @erdify/web typecheck
pnpm --filter @erdify/web build
```

Expected:

```text
1 passed
```

and:

```text
vite v
built in
```

- [ ] **Step 6: 커밋**

```powershell
git add apps/web pnpm-lock.yaml
git commit -m "feat(web): add dashboard shell with LDS"
```

## Task 6: db 패키지에 TypeORM PostgreSQL 옵션 만들기

**Files:**

- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/vitest.config.ts`
- Create: `packages/db/src/typeorm/create-typeorm-options.ts`
- Create: `packages/db/src/typeorm/create-typeorm-options.test.ts`
- Create: `packages/db/src/index.ts`
- Create: `packages/db/migrations/.gitkeep`

- [ ] **Step 1: 실패하는 TypeORM 옵션 테스트 작성**

Create `packages/db/src/typeorm/create-typeorm-options.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createTypeOrmOptions } from "./create-typeorm-options";

describe("createTypeOrmOptions", () => {
  it("creates postgres TypeORM options from DATABASE_URL", () => {
    const options = createTypeOrmOptions({
      databaseUrl: "postgres://erdify:erdify@localhost:5432/erdify"
    });

    expect(options.type).toBe("postgres");
    expect(options.url).toBe("postgres://erdify:erdify@localhost:5432/erdify");
    expect(options.synchronize).toBe(false);
    expect(options.migrationsRun).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run:

```powershell
pnpm --filter @erdify/db test
```

Expected:

```text
No projects matched the filters
```

- [ ] **Step 3: db 패키지 작성**

Create `packages/db/package.json`:

```json
{
  "name": "@erdify/db",
  "private": true,
  "version": "0.0.0",
  "type": "commonjs",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "require": "./dist/index.js",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "lint": "eslint src",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "typeorm": "^0.3.22"
  },
  "devDependencies": {
    "@erdify/config-typescript": "workspace:*",
    "vitest": "^3.1.2"
  }
}
```

Create `packages/db/tsconfig.json`:

```json
{
  "extends": "@erdify/config-typescript/node.json",
  "compilerOptions": {
    "declaration": true,
    "module": "CommonJS",
    "moduleResolution": "Node",
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

Create `packages/db/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node"
  }
});
```

Create `packages/db/src/typeorm/create-typeorm-options.ts`:

```ts
import type { DataSourceOptions } from "typeorm";

interface CreateTypeOrmOptionsInput {
  databaseUrl: string;
}

export function createTypeOrmOptions(input: CreateTypeOrmOptionsInput): DataSourceOptions {
  return {
    type: "postgres",
    url: input.databaseUrl,
    synchronize: false,
    migrationsRun: false,
    entities: [],
    migrations: []
  };
}
```

Create `packages/db/src/index.ts`:

```ts
export { createTypeOrmOptions } from "./typeorm/create-typeorm-options";
```

Create `packages/db/migrations/.gitkeep`:

```text
```

- [ ] **Step 4: db 테스트 통과 확인**

Run:

```powershell
pnpm install
pnpm --filter @erdify/db test
pnpm --filter @erdify/db typecheck
pnpm --filter @erdify/db build
```

Expected:

```text
1 passed
```

and:

```text
exited with code 0
```

and `packages/db/dist/index.js` exists locally after build.

- [ ] **Step 5: 커밋**

```powershell
git add packages/db pnpm-lock.yaml
git commit -m "feat(db): add TypeORM postgres options"
```

## Task 7: api 앱에 NestJS health endpoint와 DB config 연결 만들기

**Files:**

- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/eslint.config.js`
- Create: `apps/api/vitest.config.ts`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/src/modules/health/health.controller.ts`
- Create: `apps/api/src/modules/health/health.controller.spec.ts`
- Create: `apps/api/src/modules/health/health.module.ts`
- Create: `apps/api/src/modules/database/database.module.ts`

- [ ] **Step 1: 실패하는 health controller 테스트 작성**

Create `apps/api/src/modules/health/health.controller.spec.ts`:

```ts
import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  it("returns ok status", async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController]
    }).compile();

    const controller = moduleRef.get(HealthController);

    expect(controller.getHealth()).toEqual({
      status: "ok",
      service: "erdify-api"
    });
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run:

```powershell
pnpm --filter @erdify/api test
```

Expected:

```text
No projects matched the filters
```

- [ ] **Step 3: api package와 설정 작성**

Create `apps/api/package.json`:

```json
{
  "name": "@erdify/api",
  "private": true,
  "version": "0.0.0",
  "type": "commonjs",
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "prebuild": "pnpm --filter @erdify/db build",
    "build": "tsc -p tsconfig.json",
    "lint": "eslint src",
    "pretypecheck": "pnpm --filter @erdify/db build",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "pretest": "pnpm --filter @erdify/db build",
    "test": "vitest run"
  },
  "dependencies": {
    "@erdify/db": "workspace:*",
    "@nestjs/common": "^11.1.0",
    "@nestjs/config": "^4.0.2",
    "@nestjs/core": "^11.1.0",
    "@nestjs/platform-express": "^11.1.0",
    "@nestjs/typeorm": "^11.0.0",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "pg": "^8.15.6",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.2",
    "typeorm": "^0.3.22"
  },
  "devDependencies": {
    "@erdify/config-eslint": "workspace:*",
    "@erdify/config-typescript": "workspace:*",
    "@nestjs/testing": "^11.1.0",
    "@types/pg": "^8.11.13",
    "tsx": "^4.19.4",
    "vitest": "^3.1.2"
  }
}
```

Create `apps/api/tsconfig.json`:

```json
{
  "extends": "@erdify/config-typescript/nest.json",
  "compilerOptions": {
    "baseUrl": ".",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

Create `apps/api/eslint.config.js`:

```js
import nest from "@erdify/config-eslint/nest";

export default nest;
```

Create `apps/api/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node"
  }
});
```

- [ ] **Step 4: NestJS 앱 코드 작성**

Create `apps/api/src/modules/health/health.controller.ts`:

```ts
import { Controller, Get } from "@nestjs/common";

interface HealthResponse {
  status: "ok";
  service: "erdify-api";
}

@Controller("health")
export class HealthController {
  @Get()
  getHealth(): HealthResponse {
    return {
      status: "ok",
      service: "erdify-api"
    };
  }
}
```

Create `apps/api/src/modules/health/health.module.ts`:

```ts
import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";

@Module({
  controllers: [HealthController]
})
export class HealthModule {}
```

Create `apps/api/src/modules/database/database.module.ts`:

```ts
import { createTypeOrmOptions } from "@erdify/db";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        createTypeOrmOptions({
          databaseUrl:
            configService.get<string>("DATABASE_URL") ??
            "postgres://erdify:erdify@localhost:5432/erdify"
        })
    })
  ]
})
export class DatabaseModule {}
```

Create `apps/api/src/app.module.ts`:

```ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./modules/database/database.module";
import { HealthModule } from "./modules/health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    DatabaseModule,
    HealthModule
  ]
})
export class AppModule {}
```

Create `apps/api/src/main.ts`:

```ts
import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    credentials: true
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);
}

void bootstrap();
```

- [ ] **Step 5: api 테스트와 typecheck 통과 확인**

Run:

```powershell
pnpm install
pnpm --filter @erdify/api test
pnpm --filter @erdify/api typecheck
```

Expected:

```text
1 passed
```

and:

```text
exited with code 0
```

- [ ] **Step 6: 커밋**

```powershell
git add apps/api pnpm-lock.yaml
git commit -m "feat(api): add NestJS health module"
```

## Task 8: erd-ui 패키지와 전체 품질 게이트 연결

**Files:**

- Create: `packages/erd-ui/package.json`
- Create: `packages/erd-ui/tsconfig.json`
- Create: `packages/erd-ui/vitest.config.ts`
- Create: `packages/erd-ui/src/components/CanvasEmptyState.tsx`
- Create: `packages/erd-ui/src/components/CanvasEmptyState.test.tsx`
- Create: `packages/erd-ui/src/index.ts`
- Modify: `README.md`

- [ ] **Step 1: 실패하는 erd-ui 테스트 작성**

Create `packages/erd-ui/src/components/CanvasEmptyState.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CanvasEmptyState } from "./CanvasEmptyState";

describe("CanvasEmptyState", () => {
  it("renders an ERD canvas empty state", () => {
    render(<CanvasEmptyState />);

    expect(screen.getByText("ERD 캔버스 준비 중")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run:

```powershell
pnpm --filter @erdify/erd-ui test
```

Expected:

```text
No projects matched the filters
```

- [ ] **Step 3: erd-ui 패키지 작성**

Create `packages/erd-ui/package.json`:

```json
{
  "name": "@erdify/erd-ui",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "lint": "eslint src",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^18.2.0"
  },
  "devDependencies": {
    "@erdify/config-typescript": "workspace:*",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@types/react": "^18.3.20",
    "jsdom": "^26.1.0",
    "vitest": "^3.1.2"
  },
  "peerDependencies": {
    "react": "^18.2.0 || ^19.0.0"
  }
}
```

Create `packages/erd-ui/tsconfig.json`:

```json
{
  "extends": "@erdify/config-typescript/react.json",
  "compilerOptions": {
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

Create `packages/erd-ui/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["src/test/setup.ts"]
  }
});
```

Create `packages/erd-ui/src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

Create `packages/erd-ui/src/components/CanvasEmptyState.tsx`:

```tsx
export function CanvasEmptyState() {
  return <div>ERD 캔버스 준비 중</div>;
}
```

Create `packages/erd-ui/src/index.ts`:

```ts
export { CanvasEmptyState } from "./components/CanvasEmptyState";
```

- [ ] **Step 4: README에 Phase 1 품질 게이트 추가**

Modify `README.md` by replacing the `## Local Commands` section with:

````markdown
## Local Commands

```powershell
pnpm install
pnpm verify:workspace
pnpm verify:configs
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Run all commands before handing off a completed task.
````

- [ ] **Step 5: 전체 품질 게이트 통과 확인**

Run:

```powershell
pnpm install
pnpm verify:workspace
pnpm verify:configs
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Expected:

```text
Workspace structure is valid.
Config packages are valid.
```

and all Turbo tasks finish with exit code `0`.

- [ ] **Step 6: 커밋**

```powershell
git add packages/erd-ui README.md pnpm-lock.yaml
git commit -m "feat(erd-ui): add editor UI package scaffold"
```

## Self-Review

Spec coverage for Phase 1:

- Turborepo workspace: Task 1
- React/Vite web app: Task 5
- NestJS API app: Task 7
- TypeORM/PostgreSQL config: Task 6 and Task 7
- LDS setup: Task 5
- Shared TypeScript configs: Task 2
- Frontend convention seeds with hooks/stores/types/API split: Task 5
- Backend convention seeds with Nest module separation: Task 7
- Domain package boundary: Task 3
- Contracts package boundary: Task 4
- ERD-specific UI package boundary: Task 8
- Quality gate: Task 8

Red-flag scan:

- The plan avoids unfinished marker words and unnamed implementation steps.
- Open product decisions from the design spec are not implemented in this Phase 1 plan.

Type consistency:

- Domain exports `createEmptyDiagram` and `validateDiagram`; tests import those names from `../index`.
- Contracts exports `createDiagramRequestSchema`; tests import that exact name.
- DB exports `createTypeOrmOptions`; API imports that exact name.
- Web app uses `AppProviders`, `httpClient`, and `useWorkspaceStore` without coupling them to later auth/editor work.

## Execution Choice

Plan complete and saved to `docs/superpowers/plans/2026-04-30-erdify-phase-1-foundation-plan.md`.

Two execution options:

1. **Subagent-Driven (recommended)** - 태스크별로 fresh subagent를 dispatch하고, 각 태스크 후 리뷰한다.
2. **Inline Execution** - 현재 세션에서 `executing-plans`를 사용해 체크포인트 단위로 실행한다.
