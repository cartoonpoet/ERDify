# ERDify

ERDify는 데이터베이스 스키마를 팀 단위로 설계·문서화·공유하기 위한 협업 웹 기반 ERD(Entity-Relationship Diagram) 편집기입니다. 시각적 캔버스 편집기에 AI 네이티브 연동 레이어를 결합해, 사람과 LLM 모두 다이어그램을 읽고 수정할 수 있습니다.

## 배경

여러 고객사 프로젝트에 걸쳐 데이터베이스 스키마를 관리하는 작업은 반복적인 고통을 수반합니다. 스키마는 마이그레이션 파일, 임시 SQL 스크립트, 혹은 오래된 스프레드시트에 흩어져 있어 시각화·공유·동기화가 모두 어렵습니다. ERDify는 이를 하나의 도구로 집중시킵니다. 버전 관리되는 문서 모델, REST API, 그리고 AI 어시스턴트(Claude 등)가 다이어그램을 직접 읽고 쓸 수 있는 MCP 서버까지 갖추고 있습니다.

## 목적

- 브라우저에서 바로 쓸 수 있는 빠르고 직관적인 ERD 편집기 제공
- diff·버전 관리·프로그래밍적 조작이 가능한 구조화된 기계 판독 스키마 포맷(`erdify.schema.v1`) 정의
- MCP(Model Context Protocol)를 통한 AI 보조 스키마 설계 — LLM이 사용자를 대신해 테이블·컬럼·관계를 추가 가능
- PostgreSQL / MySQL / MariaDB용 DDL(`CREATE TABLE` + `ALTER TABLE FK`) 언제든 내보내기

## 기대 성과

| 성과 | ERDify의 접근 방식 |
|------|-------------------|
| DB 스키마 단일 진실 원천 | 서버에 저장된 버전 관리 `DiagramDocument`, 팀 공동 편집 |
| AI 사용자 컨텍스트 전환 없음 | Claude Desktop에서 조직 → 프로젝트 → 다이어그램 탐색 및 스키마 수정 가능 |
| 이식 가능한 SQL | `generateDdl()`이 모든 다이어그램을 즉시 실행 가능한 CREATE TABLE 구문으로 변환 |
| 실시간 협업 인식 | 협업자의 선택 상태가 캔버스에 표시 |

---

## 아키텍처

```
apps/
  web/          React + Vite 프론트엔드 (편집기 캔버스, 대시보드)
  api/          NestJS REST API (인증, 조직, 프로젝트, 다이어그램)
  mcp-server/   Claude Desktop 연동용 stdio MCP 서버

packages/
  domain/       DiagramDocument 타입 + 순수 불변 커맨드 함수
  erd-ui/       React Flow 기반 캔버스 컴포넌트 (TableNode, 엣지)
  db/           TypeORM 엔티티 + 마이그레이션
  contracts/    web와 api가 공유하는 Zod API 스키마
```

`packages/domain`이 시스템의 핵심입니다. 웹 편집기와 MCP 서버 양쪽 모두 동일한 순수 커맨드 함수(`addEntity`, `addColumn`, `addRelationship`, …)를 동일한 `DiagramDocument` 타입에 적용합니다. 사람이 UI를 클릭하든, LLM이 MCP 툴을 호출하든 스키마 변형 로직이 일치합니다.

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프론트엔드 | React 19, Vite, React Flow (`@xyflow/react`), Zustand, TanStack Query, vanilla-extract |
| 백엔드 | NestJS, TypeORM, PostgreSQL, JWT (`@nestjs/jwt`) |
| AI 연동 | `@modelcontextprotocol/sdk` (stdio 트랜스포트) |
| 모노레포 | Turborepo + pnpm workspaces |
| 테스트 | Vitest |

---

## 주요 기능

- **시각적 ERD 캔버스** — 테이블 드래그·드롭, 관계선 연결, 줌/팬
- **다중 방언 DDL 내보내기** — PostgreSQL, MySQL, MariaDB
- **조직 / 프로젝트 / 다이어그램 계층** — 실제 팀 구조에 맞는 구조
- **실시간 협업자 표시** — 팀원이 선택한 엔티티를 캔버스에서 확인
- **MCP AI 연동** — Claude Desktop에서 다이어그램을 읽고 수정
- **API 키 발급** — 대시보드에서 MCP용 장기 JWT 키 발급

---

## 사용법

### 로컬 개발 환경

```bash
# 사전 조건: Node 20+, pnpm 9+, PostgreSQL 15+

pnpm install

# 환경 변수 파일 복사 후 값 입력
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# API + Web 동시 실행 (Turborepo가 둘 다 실행)
pnpm dev

# 또는 Docker Compose로 실행 (Postgres 포함)
docker compose up
```

웹 앱은 **http://localhost:5173**, API는 **http://localhost:4000** 에서 실행됩니다.

### 워크스페이스 명령어

```bash
pnpm lint               # 전체 패키지 ESLint
pnpm typecheck          # 전체 패키지 tsc --noEmit
pnpm test               # 전체 패키지 Vitest
pnpm build              # 프로덕션 빌드
pnpm verify:workspace   # pnpm 워크스페이스 무결성 검사
pnpm verify:configs     # 공유 tsconfig/eslint 설정 검사
```

### API 키 발급 (MCP 연동용)

1. ERDify 웹 앱에 로그인
2. 우측 상단 아바타 클릭 → **MCP API 키**
3. **API 키 생성** 클릭 — 키는 한 번만 표시되므로 즉시 복사
4. 이 키를 Claude Desktop 설정의 `ERDIFY_API_KEY`에 입력

### Claude Desktop MCP 연동

`~/Library/Application Support/Claude/claude_desktop_config.json`에 추가:

```json
{
  "mcpServers": {
    "erdify": {
      "command": "node",
      "args": ["/path/to/ERDify/apps/mcp-server/dist/index.js"],
      "env": {
        "ERDIFY_API_URL": "http://localhost:4000",
        "ERDIFY_API_KEY": "<발급받은 API 키>"
      }
    }
  }
}
```

Claude Desktop을 재시작한 뒤 다음과 같이 요청할 수 있습니다:

> "내 ERDify 조직 목록 보여줘"  
> "다이어그램 `<id>`에 `payments` 테이블 추가해줘. 컬럼은 id(uuid, PK), amount(integer), created_at(timestamp)"  
> "다이어그램 `<id>`의 DDL 생성해줘"

사용 가능한 MCP 툴: `list_organizations`, `list_projects`, `list_diagrams`, `get_diagram`, `get_ddl`, `add_table`, `remove_table`, `add_column`, `update_column`, `remove_column`, `add_relationship`, `remove_relationship`

---

## 핵심 로직

### 1. 불변 문서 모델 (`packages/domain`)

모든 다이어그램은 순수한 `DiagramDocument` 객체입니다. 모든 변형은 새로운 문서를 반환하는 순수 함수로 처리합니다. 클래스도 없고, 직접 변형도 없고, 사이드 이펙트도 없습니다.

```typescript
// packages/domain/src/types/diagram.type.ts
export interface DiagramDocument {
  format: "erdify.schema.v1";
  id: string;
  name: string;
  dialect: "postgresql" | "mysql" | "mariadb";
  entities: DiagramEntity[];
  relationships: DiagramRelationship[];
  layout: DiagramLayout;       // { entityPositions: Record<id, {x, y}> }
  metadata: DiagramMetadata;   // { revision, createdAt, updatedAt, ... }
  indexes: [];
  views: [];
}
```

커맨드 함수는 스프레드로 문서를 업데이트합니다. 변경되지 않은 엔티티의 참조는 그대로 유지되며, 이는 React의 `memo`가 올바르게 동작하는 데 핵심적입니다.

```typescript
// packages/domain/src/commands/entity-commands.ts
export function addEntity(
  doc: DiagramDocument,
  input: { id: string; name: string; position?: EntityPosition }
): DiagramDocument {
  const entity: DiagramEntity = { id: input.id, name: input.name, logicalName: null, comment: null, columns: [] };
  return {
    ...doc,
    entities: [...doc.entities, entity],
    layout: { ...doc.layout, entityPositions: { ...doc.layout.entityPositions, [input.id]: input.position } },
  };
}

export function removeEntity(doc: DiagramDocument, entityId: string): DiagramDocument {
  const { [entityId]: _removed, ...remainingPositions } = doc.layout.entityPositions;
  return {
    ...doc,
    entities: doc.entities.filter((e) => e.id !== entityId),
    relationships: doc.relationships.filter(
      (r) => r.sourceEntityId !== entityId && r.targetEntityId !== entityId
    ),
    layout: { ...doc.layout, entityPositions: remainingPositions },
  };
}
```

### 2. 대규모 다이어그램 드래그 성능 (`apps/web`)

100개 이상의 테이블을 다룰 때 드래그 성능을 확보하기 위해 세 가지 최적화를 적용했습니다.

**① Automerge 구독 조기 종료**

`useRealtimeCollaboration`은 zustand store 전체를 구독합니다. 드래그 중에는 `nodes`(위치 배열)만 바뀌고 `document`는 동일한 참조를 유지합니다. 이를 이용해 `document`가 실제로 바뀌지 않은 경우 `Automerge.change()` 실행 자체를 차단합니다.

```typescript
// apps/web/src/features/editor/hooks/useRealtimeCollaboration.ts
const unsubDoc = useEditorStore.subscribe((state, prevState) => {
  if (state.document === prevState.document) return; // drag-move 프레임은 여기서 즉시 종료
  // ...Automerge.change() 실행
});
```

드래그 MOVE(초당 ~60회) 시 Automerge CRDT 연산이 실행되지 않아, 100테이블 문서에서도 블로킹이 사라집니다.

**② applyDiff 참조 동등 단락(short-circuit)**

드래그 STOP 시 `Automerge.change()` 내부의 `applyDiff`가 실행됩니다. 기존에는 엔티티/관계/인덱스 전체를 순회하며 Automerge draft proxy에 O(n²)으로 접근했습니다. 불변 커맨드 함수는 변경되지 않은 섹션의 참조를 그대로 유지하므로, 참조가 같은 섹션은 전체 루프를 스킵합니다.

```typescript
function applyDiff(draft, prev, next) {
  // 위치 이동 시 prev.entities === next.entities → 엔티티 루프 전체 스킵
  if (prev.entities !== next.entities) { /* 엔티티 diff */ }
  if (prev.layout.entityPositions !== next.layout.entityPositions) { /* 위치만 반영 */ }
  if (prev.relationships !== next.relationships) { /* 관계 diff */ }
  if (prev.indexes !== next.indexes) { /* 인덱스 diff */ }
}
```

테이블 이동 한 번에 Automerge 연산이 O(n²) → O(1)로 줄어듭니다.

**③ edges 안정 참조**

`edges` 배열을 매 렌더마다 `document.relationships.map()`으로 생성하면, 드래그 중 EditorCanvas가 리렌더될 때마다 새 객체 100개가 생성되어 ReactFlow가 전체 엣지를 재처리합니다. `edges`를 zustand store에서 관리하고 `document.relationships` 참조가 실제로 바뀔 때만 재계산합니다.

```typescript
// useEditorStore — applyCommand
edges: next.relationships !== document.relationships ? docToEdges(next) : edges,
```

드래그 중 `edges` 배열 참조가 변하지 않아 ReactFlow가 엣지 처리를 건너뜁니다.

---

**노드 증분 비교 (`updateNodes`)**

커맨드를 실행할 때마다 전체 문서를 React Flow 노드로 변환하면 모든 노드가 다시 렌더링됩니다. `updateNodes`는 참조 동등성 비교를 통해 실제로 변경된 엔티티에 대해서만 새 노드 객체를 생성합니다.

```typescript
// apps/web/src/features/editor/stores/useEditorStore.ts
function updateNodes(prevDoc, nextDoc, prevNodes, collaborators) {
  return nextDoc.entities.map((entity) => {
    const entitySame   = prevEntityMap.get(entity.id) === entity;
    const positionSame = prevDoc.layout.entityPositions[entity.id]
                      === nextDoc.layout.entityPositions[entity.id];
    const collabSame   = prevNode?.data.collaboratorColor === collab?.color;

    if (prevNode && entitySame && positionSame && collabSame) return prevNode; // 리렌더 스킵
    return { /* 새 노드 객체 생성 */ };
  });
}
```

### 3. MCP 쓰기 툴 패턴 (`apps/mcp-server`)

모든 쓰기 툴은 동일한 3단계 패턴을 따릅니다: **현재 다이어그램 GET → 도메인 커맨드 적용 → PATCH로 저장**. MCP 서버가 웹 편집기와 정확히 동일한 순수 함수를 재사용합니다.

```typescript
// apps/mcp-server/src/tools/write-tools.ts
server.tool(
  "add_table",
  "Add a new table to a diagram",
  {
    diagramId: z.string(),
    name: z.string(),
    columns: z.array(columnInputSchema).optional(),
  },
  async ({ diagramId, name, columns }) => {
    const { content: doc } = await client.getDiagram(diagramId);   // GET
    const entityId = randomUUID();
    let updated = addEntity(doc, { id: entityId, name });           // 도메인 커맨드
    if (columns) {
      for (let i = 0; i < columns.length; i++) {
        updated = addColumn(updated, entityId, buildColumn(columns[i]!, i));
      }
    }
    await client.updateDiagram(diagramId, updated);                 // PATCH
    return { content: [{ type: "text", text: `Table "${name}" added.` }] };
  }
);
```

모든 커맨드가 순수하고 문서가 단순한 JSON 객체이므로, MCP 서버는 ORM도, DB 연결도 필요 없습니다. ERDify REST API와만 통신합니다.

### 4. DDL 생성 (`packages/domain`)

`generateDdl`은 `DiagramDocument`를 SQL로 변환합니다. 복합 기본 키, PostgreSQL(큰따옴표)과 MySQL/MariaDB(백틱) 간의 식별자 인용 차이를 처리하고, 모든 `CREATE TABLE` 구문 뒤에 `ALTER TABLE … ADD CONSTRAINT … FOREIGN KEY` 구문을 생성합니다.

```typescript
// packages/domain/src/utils/ddl-generator.ts
export function generateDdl(doc: DiagramDocument): string {
  const { dialect, entities, relationships } = doc;
  const tableParts = entities.map((e) => entityDdl(e, dialect));
  const fkParts    = relationships.map((r) => fkDdl(r, entities, dialect)).filter(Boolean);
  return [...tableParts, ...fkParts].join("\n\n\n");
}

// 출력 예시 (PostgreSQL):
// CREATE TABLE "users" (
//   "id" uuid NOT NULL,
//   "email" varchar NOT NULL UNIQUE,
//   PRIMARY KEY ("id")
// );
//
// ALTER TABLE "posts"
//   ADD CONSTRAINT "fk_posts_users"
//   FOREIGN KEY ("user_id")
//   REFERENCES "users" ("id")
//   ON DELETE CASCADE
//   ON UPDATE NO ACTION;
```

### 5. JWT를 API 키로 활용 (`apps/api`)

MCP 클라이언트는 만료되지 않는 안정적인 인증 정보가 필요합니다. 별도의 키 테이블 대신, ERDify는 일반 액세스 토큰과 동일한 시크릿으로 서명된 장기 JWT(100년 만료)를 발급합니다. `JwtAuthGuard`가 동일하게 검증하므로 특별 처리가 필요 없습니다.

```typescript
// apps/api/src/modules/auth/auth.service.ts
generateApiKey(userId: string, email: string): { apiKey: string } {
  return { apiKey: this.jwtService.sign({ sub: userId, email }, { expiresIn: "100y" }) };
}

// apps/api/src/modules/auth/auth.controller.ts
@Post("api-key")
@UseGuards(JwtAuthGuard)
generateApiKey(@CurrentUser() user: JwtPayload): { apiKey: string } {
  return this.authService.generateApiKey(user.sub, user.email);
}
```

---

## 앱 & 패키지

| 경로 | 설명 |
|------|------|
| `apps/web` | React/Vite 프론트엔드 — 대시보드, ERD 캔버스 편집기 |
| `apps/api` | NestJS REST API — 인증, 조직, 프로젝트, 다이어그램 |
| `apps/mcp-server` | stdio MCP 서버 — Claude Desktop용 12개 툴 |
| `packages/domain` | `DiagramDocument` 타입, 순수 커맨드, DDL 생성기, 유효성 검사 |
| `packages/erd-ui` | React Flow 캔버스 프리미티브 (`TableNode`, 엣지 타입) |
| `packages/db` | TypeORM 엔티티 + 마이그레이션 러너 |
| `packages/contracts` | 요청/응답 유효성 검사용 Zod 스키마 (공유) |
| `packages/config-typescript` | 공유 `tsconfig` 베이스 파일 |
| `packages/config-eslint` | 공유 ESLint 설정 |
