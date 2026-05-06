# ERDify

> AI와 함께 스키마를 관리하는 협업 ERD 도구

사용하는 AI 도구(Cursor · Claude · Gemini · Codex)에서 MCP로 연결하세요. 스키마 설계부터 DDL·ORM 생성, 팀 실시간 협업까지 — AI와 함께 일하는 데이터베이스 도구입니다.

**🌐 [erdify.kro.kr](http://erdify.kro.kr)** · **앱: [erdify-app.kro.kr](http://erdify-app.kro.kr)**

---

## 주요 기능

| | |
|---|---|
| 🤖 **AI 연동 (MCP)** | AI가 MCP로 ERD를 읽고 자연어 지시에 따라 함께 수정 |
| ⚡ **실시간 협업** | 팀원과 동시에 편집, 커서 위치·변경사항 실시간 반영 |
| ⇅ **DDL 가져오기 / 내보내기** | MySQL · PostgreSQL · MariaDB · MSSQL DDL 붙여넣기로 ERD 자동 생성. COMMENT → 논리명 자동 매핑 |
| ⌨ **ORM 코드 생성** | TypeORM · Prisma · SQLAlchemy 코드를 ERD에서 즉시 내보내기 |
| ⏱ **버전 관리** | 변경 이력 자동 기록, 언제든 이전 버전으로 복원 |
| 🔗 **공유 링크** | 읽기 전용 링크로 외부 공유 (만료 시간 설정 가능) |

---

## MCP 연동 — AI 도구에서 스키마 관리

[설정 → API](http://erdify-app.kro.kr/settings/api)에서 API 키를 발급한 뒤, 사용하는 AI 도구에 설정하세요.

### Cursor

`.cursor/mcp.json`

```json
{
  "mcpServers": {
    "erdify": {
      "command": "npx",
      "args": ["-y", "@erdify/mcp-server@latest"],
      "env": {
        "ERDIFY_API_KEY": "erd_your_api_key_here"
      }
    }
  }
}
```

### Claude Desktop

`~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "erdify": {
      "command": "npx",
      "args": ["-y", "@erdify/mcp-server@latest"],
      "env": {
        "ERDIFY_API_KEY": "erd_your_api_key_here"
      }
    }
  }
}
```

### Gemini CLI

`~/.gemini/settings.json`

```json
{
  "mcpServers": {
    "erdify": {
      "command": "npx",
      "args": ["-y", "@erdify/mcp-server@latest"],
      "env": {
        "ERDIFY_API_KEY": "erd_your_api_key_here"
      }
    }
  }
}
```

### Codex CLI

`~/.codex/config.yaml`

```yaml
mcp_servers:
  erdify:
    command: npx
    args:
      - -y
      - "@erdify/mcp-server@latest"
    env:
      ERDIFY_API_KEY: erd_your_api_key_here
```

연결 후 AI에게 바로 요청할 수 있습니다:

```
결제 시스템 추가해줘. orders랑 order_items 테이블 필요해
→ AI가 ERDify MCP로 현재 스키마를 확인하고 테이블·관계를 추가합니다
```

**사용 가능한 MCP 툴:** `list_organizations` · `list_projects` · `list_diagrams` · `get_diagram` · `get_ddl` · `add_table` · `remove_table` · `add_column` · `update_column` · `remove_column` · `add_relationship` · `remove_relationship`

---

## REST API

```bash
# 스키마 조회
curl https://api.erdify.com/v1/projects/proj_abc/schema \
  -H "Authorization: Bearer erd_your_api_key_here"

# 테이블 추가
curl -X POST https://api.erdify.com/v1/projects/proj_abc/entities \
  -H "Authorization: Bearer erd_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{"name": "orders", "columns": [{"name": "id", "type": "INT", "primaryKey": true}]}'

# DDL 내보내기
curl "https://api.erdify.com/v1/projects/proj_abc/ddl?dialect=postgresql" \
  -H "Authorization: Bearer erd_your_api_key_here"
```

자세한 API 레퍼런스: [erdify.kro.kr/docs/api-reference](http://erdify.kro.kr/docs/api-reference)

---

## 로컬 개발

```bash
# 사전 조건: Node 20+, pnpm 9+, PostgreSQL 15+

pnpm install

cp apps/api/.env.example apps/api/.env   # DB 연결 등 환경 변수 입력
cp apps/web/.env.example apps/web/.env

pnpm dev   # 웹: http://localhost:5173 · API: http://localhost:4000

# 또는 Docker Compose (Postgres 포함)
docker compose up
```

### 워크스페이스 명령어

```bash
pnpm lint           # 전체 패키지 ESLint
pnpm typecheck      # 전체 패키지 tsc --noEmit
pnpm test           # 전체 패키지 Vitest
pnpm build          # 프로덕션 빌드
```

---

## 아키텍처

```
apps/
  web/          React + Vite — 편집기 캔버스, 대시보드
  api/          NestJS REST API — 인증, 조직, 프로젝트, 다이어그램
  landing/      Astro 정적 사이트 — 랜딩페이지 + 개발자 센터
  mcp-server/   AI 도구 연동용 stdio MCP 서버

packages/
  domain/       DiagramDocument 타입 + 순수 커맨드 함수 + DDL 생성기
  erd-ui/       React Flow 기반 캔버스 컴포넌트 (TableNode, 엣지)
  db/           TypeORM 엔티티 + 마이그레이션
  contracts/    web ↔ api 공유 Zod API 스키마
```

### 핵심 설계 원칙

**불변 문서 모델** — 모든 다이어그램은 순수한 `DiagramDocument` JSON 객체입니다. 모든 변형은 새로운 문서를 반환하는 순수 함수로 처리됩니다. 웹 편집기와 MCP 서버가 동일한 커맨드 함수를 재사용합니다.

```typescript
// packages/domain/src/types/diagram.type.ts
export type DiagramDialect = "postgresql" | "mysql" | "mariadb" | "mssql";

export interface DiagramDocument {
  format: "erdify.schema.v1";
  id: string;
  name: string;
  dialect: DiagramDialect;
  entities: DiagramEntity[];
  relationships: DiagramRelationship[];
  layout: DiagramLayout;
  metadata: DiagramMetadata;
  indexes: DiagramIndex[];
  views: [];
}
```

**MCP 쓰기 툴 패턴** — 현재 다이어그램 GET → 도메인 커맨드 적용 → PATCH로 저장. ORM도 DB 연결도 필요 없습니다.

```typescript
// GET → 커맨드 → PATCH
const doc = await client.getDiagram(diagramId);
const updated = addEntity(doc, { id: randomUUID(), name: "orders" });
await client.updateDiagram(diagramId, updated);
```

**DDL 생성** — `generateDdl(doc)`이 방언별 식별자 인용(`"name"` · `` `name` `` · `[name]`), 복합 PK, FK ALTER TABLE, COMMENT를 처리합니다.

### 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프론트엔드 | React 19, Vite, React Flow (`@xyflow/react`), Zustand, vanilla-extract |
| 백엔드 | NestJS, TypeORM, PostgreSQL, JWT |
| AI 연동 | `@modelcontextprotocol/sdk` (stdio) |
| 모노레포 | Turborepo + pnpm workspaces |
| 테스트 | Vitest |
