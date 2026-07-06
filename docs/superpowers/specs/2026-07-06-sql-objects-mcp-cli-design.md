# SQL 객체(프로시저·함수·트리거·뷰) 지원 — MCP·CLI + 도메인 기반

- **이슈**: cartoonpoet/ERDify#28
- **담당**: seongyeon1
- **날짜**: 2026-07-06

## 배경

`DiagramDocument`에 SQL 객체(프로시저·함수·트리거·뷰)를 **종류 + 이름 + SQL 원문**으로
통일 저장하는 기능. 선행 의존성 ➊(도메인 타입/커맨드)과 웹 에디터 UI는 **이미
`origin/master`에 머지됨**(커밋 `53f5e8a` "feat(editor): SQL 객체 저장 기능"). 이 작업은
이슈 #28의 남은 범위인 **MCP·CLI 반영 + 공유 유틸(조회/DDL) 확장(➋➌➍)** 만 담당한다.

> **초기 조사 정정**: 브레인스토밍 초반 조사는 stale 브랜치
> `feat/cli-rel-autoincrement`(master 뒤처짐) 기준이라 도메인이 비어 보였다. `origin/master`
> 기반으로 재확인한 결과 ➊은 완료돼 있었고, 그에 따라 아래 결정 일부(특히 views)를 정정한다.

## 이미 머지된 것 (origin/master `53f5e8a` — 이 작업 범위 아님)

- `DiagramObjectKind`, `DiagramObject { id, kind, name, sql }` 타입 (**`id` 포함**),
  `DiagramDocument.objects?: DiagramObject[]` (optional).
- 순수 커맨드 `addObject`/`updateObject`/`removeObject` (`objects ?? []` 방어) + `index.ts` export
  + `object-commands.test.ts`.
- `create-empty-diagram.ts`에 `objects: []` 추가. **`views: []`는 유지**.
- 웹 에디터 "객체" 탭 UI.

## 확정된 결정

1. **범위**: MCP + CLI + 공유 유틸(➋➌➍)만. 도메인 타입/커맨드는 이미 존재하므로 재사용.
   **web/api는 전혀 손대지 않는다.**
2. **`objects` optional 유지**: 머지된 `objects?: DiagramObject[]` 그대로 사용.
3. **DDL export 포함 + 경고**: 객체 `sql` 원문을 DDL 출력에 append하고, 객체당
   `object_raw_sql` 경고("검증되지 않은 원문")를 남긴다.
4. **편집 수단 포함**: MCP `add_object`/`update_object`/`remove_object`,
   CLI `add object`/`update object`/`remove object`. 머지된 도메인 커맨드를 호출만 한다.
5. **views 유지 (정정)**: 머지된 코드가 `views: []` placeholder를 의도적으로 남겼으므로
   제거하지 않는다. view는 `objects`의 `kind:'view'`로 저장되며 placeholder는 공존한다.
   → **web/api의 `views: []` 리터럴은 건드리지 않는다.**
6. **DDL 헤더 형식**: `-- Objects` 섹션 배너 + 객체별 `-- <kind>: <name>` 주석
   (기존 `-- Seed Data` 스타일과 일관).

## 도메인 타입 변경 (오직 `DdlWarningCode` 확장만)

- `DdlWarningCode` 유니온에 `"object_raw_sql"` 추가 (`packages/domain/src/types/diagram.type.ts`).
- `DiagramObject`/`objects` 타입은 이미 존재 → 신규 정의 없음.

## 공유 유틸 (한 곳 수정 → CLI·MCP·web 동시 반영)

### `utils/format-diagram.ts`
- 관계 섹션 뒤에 `Objects (N):` 섹션 추가. 각 줄 `  <kind> <name> [objectId: <id>]`.
- `doc.objects ?? []` 가드로 optional 대응.

### `utils/ddl-generator.ts` — `generateDdlReport`
- 구조분해에 `objects` 추가(`doc.objects ?? []`).
- FK 파트 뒤에 objects 블록 append:
  - 객체가 있으면 `-- Objects` 배너 1줄.
  - 각 객체마다 `-- <kind>: <name>` 주석 + `object.sql` 원문(trim).
  - 각 객체마다 `warnings.push({ code: "object_raw_sql", message: ... })`
    ("객체 `<name>`의 SQL은 원문 텍스트라 dialect 검증 대상이 아님").
- `generateSetupSql`은 내부적으로 `generateDdl`을 호출하므로 자동 반영(수정 불필요).

### `validation/validate-diagram.ts`
- objects 순회하며:
  - 빈 `sql`(trim 후 공백) → error.
  - 이름 중복(`kind`+`name` 조합 기준) → error.
- `objects ?? []` 가드.

### `commands/object-commands.ts` — 이미 존재 (재사용)
`addObject/updateObject/removeObject`가 이미 머지돼 있고 index export도 됨. MCP·CLI는 이를
import해서 호출만 한다. 신규 작성 없음.

## MCP 서버 (`apps/mcp-server`)

### `src/tools/write-tools.ts`
- `columnInputSchema` 옆에 `objectInputSchema`:
  ```ts
  const objectKindSchema = z.enum(["procedure", "function", "trigger", "view"]);
  const objectInputSchema = z.object({
    kind: objectKindSchema,
    name: z.string().describe("Object name"),
    sql: z.string().describe("CREATE ... statement (stored as raw text, not parsed)"),
  });
  ```
- 도구 3종 등록(`add_table`/`remove_table` 패턴):
  - `add_object` → `randomUUID()` id 생성, `addObject`, 반환에 `objectId`.
  - `update_object` → `objectId` + optional `{kind,name,sql}` → `updateObject`.
  - `remove_object` → `objectId` → `removeObject` (없으면 throw).
  - 각기 `client.recordToolCall(...)` 호출.
- `@erdify/domain`에서 `addObject/updateObject/removeObject`, 타입 import.

### `src/tools/read-tools.ts`
- `get_diagram`(formatDiagram)·`get_ddl`(generateDdlReport)은 공유 유틸 사용 →
  **코드 변경 없이 자동 반영**.

### 버전업
- `apps/mcp-server/package.json` `0.2.9 → 0.3.0`
- `apps/mcp-server/src/index.ts:9` `version: "0.2.9" → "0.3.0"` (하드코딩 두 곳 수동)

## CLI (`apps/cli`)

### `src/index.ts`
- **버전 정합**: `.version("0.0.0")` → `.version("0.1.9")` (package.json과 일치).
- `add object <diagramId>` 명령(add column 패턴):
  - `--kind <kind>` (required, enum 검증), `--name <name>` (required),
    `--sql <sql>` 또는 `--sql-file <path>` (택1, 둘 다 없으면 에러).
  - `randomUUID()` id, `addObject`, `updateDiagram`, `objectId` 출력.
- `update object <diagramId> <objectId>`: `--kind/--name/--sql/--sql-file` optional.
- `remove object <diagramId> <objectId>`: `removeObject`.
- `get diagram/ddl/setup`은 공유 유틸 사용 → 자동 반영(수정 불필요).

### 버전업
- `apps/cli/package.json` `0.1.8 → 0.1.9`.

## views — 손대지 않음

머지된 코드가 `views: []` placeholder를 유지하기로 결정했으므로 이 작업에서는 제거하지
않는다. web/api의 `views: []` 리터럴도 그대로 둔다. (초기 스펙의 "views 제거" 방향은 철회.)

## 테스트

- `utils/ddl-generator.test.ts` — objects가 DDL에 `-- Objects` 배너 + `-- <kind>: <name>`
  헤더 + 원문으로 append되고, 객체당 `object_raw_sql` 경고가 생기는지. objects 없을 때
  기존 출력 불변.
- `utils/format-diagram.test.ts` — Objects 섹션 출력, objects 없을 때 섹션 미출력.
- `validation/validate-diagram.test.ts` — 빈 sql / 이름 중복 error, 정상 objects는 valid.
- MCP/CLI는 도메인 커맨드 위임이라 유닛 테스트는 도메인 계층에서 커버. 수동 스모크로 확인.

## 범위 밖 (별도 이슈 권장)

- DDL **import** 시 `CREATE PROCEDURE/FUNCTION/TRIGGER/VIEW` 파싱 → `objects[]` 매핑.
  현재 DDL 파서는 web 전용(`apps/web/src/shared/utils/ddl-parser.ts`)이라 domain
  승격이 선행돼야 함.

## 리스크 / 주의

- 도메인 기반은 이미 `origin/master`에 있으므로 충돌 위험 낮음. 이 작업은 순수 소비 계층.
- 객체 `sql`은 검증되지 않은 원문 → DDL 출력 시 항상 `object_raw_sql` 경고로 명시.
- `objects`는 optional이라 모든 소비 지점에서 `doc.objects ?? []` 가드 필수.
