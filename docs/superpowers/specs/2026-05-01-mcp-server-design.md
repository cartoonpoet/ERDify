# ERDify MCP Server Design

**Date:** 2026-05-01  
**Status:** Approved

## Overview

ERDify의 다이어그램 데이터를 MCP(Model Context Protocol)로 노출하는 독립 서버. Claude Desktop 같은 MCP 클라이언트가 stdio로 연결해 자연어로 ERD를 읽고 편집할 수 있게 한다.

## Architecture

```
Claude Desktop
      │  stdio (JSON-RPC)
      ▼
apps/mcp-server          ← 새 패키지 (Node.js 프로세스)
  @modelcontextprotocol/sdk
  @erdify/domain          ← 기존 도메인 커맨드 재사용
      │  HTTP + API Key (장기 JWT)
      ▼
apps/api (NestJS)
  POST /auth/api-key     ← 신규: 만료 없는 JWT 발급
  GET  /projects
  GET  /projects/:id/diagrams
  GET  /diagrams/:id
  PATCH /diagrams/:id    ← 기존 엔드포인트
      │
      ▼
packages/db (TypeORM)
```

### Write 흐름

모든 Write 툴은 동일한 패턴을 따른다:

1. `GET /diagrams/:id` → 현재 `DiagramDocument` 가져오기
2. `@erdify/domain` 커맨드 적용 (addEntity, addColumn 등)
3. `PATCH /diagrams/:id` → 변경된 document 저장

웹 에디터와 동일한 도메인 로직을 재사용하므로 일관성 보장.

## Package Structure

```
apps/mcp-server/
  package.json
  tsconfig.json
  src/
    index.ts          ← McpServer 초기화, StdioServerTransport
    client.ts         ← ERDify REST API HTTP 클라이언트 (fetch 기반)
    tools/
      read-tools.ts   ← list_projects, list_diagrams, get_diagram, get_ddl
      write-tools.ts  ← add_table, remove_table, add_column, update_column,
                         remove_column, add_relationship, remove_relationship
```

**Dependencies:**
- `@modelcontextprotocol/sdk` — MCP 서버 구현
- `@erdify/domain` (workspace) — 도메인 커맨드, 타입, DDL 생성
- Node.js built-in `fetch` (Node 18+)

> **참고:** `generateDdl()` 함수는 현재 `apps/web/src/shared/utils/ddl-generator.ts`에 있음.
> 구현 시 `packages/domain/src/`로 이동해 `@erdify/domain`에서 export 해야 함.

**환경변수:**
- `ERDIFY_API_URL` — ERDify API 베이스 URL (예: `http://localhost:3000`)
- `ERDIFY_API_KEY` — 장기 JWT (API 키)

## MCP Tools

### Read Tools

| Tool | 인자 | 동작 |
|------|------|------|
| `list_projects` | — | `GET /projects` → 프로젝트 id·name 목록 반환 |
| `list_diagrams` | `projectId: string` | `GET /projects/:id/diagrams` → 다이어그램 id·name·updatedAt 목록 |
| `get_diagram` | `diagramId: string` | `GET /diagrams/:id` → 테이블·컬럼·관계를 읽기 좋은 텍스트로 포맷 |
| `get_ddl` | `diagramId: string` | `GET /diagrams/:id` → `generateDdl()` 적용 후 SQL 반환 |

`get_diagram` 응답 포맷 예시:
```
Diagram: "쇼핑몰 ERD" (postgresql)

Tables (3):
  users
    - id: uuid PK
    - email: varchar NOT NULL UNIQUE
    - created_at: timestamp

  orders
    - id: uuid PK
    - user_id: uuid FK→users.id
    - total: decimal

Relationships:
  orders.user_id → users.id (many-to-one, CASCADE)
```

### Write Tools

모든 Write 툴은 이름 기반으로 테이블/컬럼을 조회해 Claude가 ID 없이 조작 가능.

| Tool | 인자 | 동작 |
|------|------|------|
| `add_table` | `diagramId`, `name`, `columns?` | `addEntity()` 적용, columns 있으면 `addColumn()` 반복 |
| `remove_table` | `diagramId`, `tableName` | 이름으로 entity 찾아 `removeEntity()` |
| `add_column` | `diagramId`, `tableName`, `column` | `addColumn()` 적용 |
| `update_column` | `diagramId`, `tableName`, `columnName`, `updates` | `updateColumn()` 적용 |
| `remove_column` | `diagramId`, `tableName`, `columnName` | `removeColumn()` 적용 |
| `add_relationship` | `diagramId`, `sourceTable`, `targetTable`, `cardinality` | `addRelationship()` 적용 |
| `remove_relationship` | `diagramId`, `sourceTable`, `targetTable` | 이름으로 관계 찾아 `removeRelationship()` (복수 매칭 시 첫 번째 제거) |

`column` 인자 스키마:
```ts
{
  name: string;
  type: string;          // "varchar", "uuid", "integer", etc.
  nullable?: boolean;    // default: true
  primaryKey?: boolean;  // default: false
  unique?: boolean;      // default: false
  defaultValue?: string;
}
```

`cardinality`: `"one-to-one" | "one-to-many" | "many-to-one"`

## Backend Changes

### 신규: `POST /auth/api-key`

- JwtAuthGuard 적용 (기존 JWT로 인증 후 호출)
- 응답: `{ apiKey: string }` — `expiresIn: "100y"` JWT
- 토큰 payload: 기존 `JwtPayload`와 동일 (`sub`, `email`)

기존 `AuthService.sign()` 로직 재사용, `expiresIn` 옵션만 오버라이드.

### 기존: `PATCH /diagrams/:id`

이미 존재함 (`DiagramsController.update`). MCP 서버는 이 엔드포인트를 그대로 사용.

## Claude Desktop 설정

빌드 후 `~/.claude_desktop/config.json` (또는 macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "erdify": {
      "command": "node",
      "args": ["/absolute/path/to/apps/mcp-server/dist/index.js"],
      "env": {
        "ERDIFY_API_URL": "http://localhost:3000",
        "ERDIFY_API_KEY": "eyJ..."
      }
    }
  }
}
```

## Error Handling

- 툴 실행 중 API 오류 → MCP 에러 응답 (`isError: true`, 메시지 포함)
- 테이블/컬럼 이름 못 찾으면 → 명확한 에러 메시지 (`"Table 'foo' not found in diagram"`)
- 네트워크 오류 → 에러 메시지로 전파

## Out of Scope

- 다이어그램 생성/삭제 툴 (Read+Write만, 프로젝트 관리 제외)
- API 키 폐기/관리 UI
- OAuth 인증 플로우
- 실시간 협업 연동
