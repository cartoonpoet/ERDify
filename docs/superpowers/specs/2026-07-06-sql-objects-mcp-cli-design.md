# SQL 객체(프로시저·함수·트리거·뷰) 지원 — MCP·CLI + 도메인 기반

- **이슈**: cartoonpoet/ERDify#28
- **담당**: seongyeon1
- **날짜**: 2026-07-06

## 배경

`DiagramDocument`에 SQL 객체(프로시저·함수·트리거·뷰)를 **종류 + 이름 + SQL 원문**으로
통일 저장하는 기능. 이슈 #28은 MCP·CLI 작업으로 정리돼 있으나, 선행 의존성인
`packages/domain` 타입 변경(➊)이 담당 예정이던 웹 PR에 아직 없고 해당 PR/브랜치도
열려있지 않다. 따라서 **이 작업에서 도메인 기반(➊+➍)까지 함께 구현**하여 웹 없이도
end-to-end로 동작하게 한다.

## 확정된 결정

1. **범위**: 도메인 기반(➊ 타입 + ➍ 공유 유틸) + MCP + CLI를 한 번에 구현. web/api는
   타입 변경의 기계적 귀결(`views: []` 제거)만 정리.
2. **`objects` optional**: 구 저장 데이터 호환을 위해 `objects?: DiagramObject[]`.
3. **DDL export 포함 + 경고**: 객체 `sql` 원문을 DDL 출력에 append하고, 객체당
   `object_raw_sql` 경고("검증되지 않은 원문")를 남긴다.
4. **편집 수단 포함**: MCP `add_object`/`update_object`/`remove_object`,
   CLI `add object`/`update object`/`remove object`.
5. **views → objects 흡수**: 죽은 placeholder `views: []`를 제거하고 view는
   `objects`의 `kind:'view'`로 통일.
6. **DDL 헤더 형식**: `-- Objects` 섹션 배너 + 객체별 `-- <kind>: <name>` 주석
   (기존 `-- Seed Data` 스타일과 일관).

## 도메인 타입 (`packages/domain/src/types/diagram.type.ts`)

```ts
export type DiagramObjectKind = "procedure" | "function" | "trigger" | "view";

export interface DiagramObject {
  id: string;              // CRUD 대상 지정용. entities/indexes와 동일 관례(stableObjectIds).
  kind: DiagramObjectKind;
  name: string;
  sql: string;             // CREATE ... 원문. 텍스트 보관만, 파싱/검증 없음.
}
```

- `DiagramDocument`에서 **`views: []` 제거**, **`objects?: DiagramObject[]` 추가**.
- `DdlWarningCode` 유니온에 `"object_raw_sql"` 추가.

> **이슈 원문과의 차이 — `id` 필드**: 이슈 예시(`{kind, name, sql}`)엔 `id`가 없으나,
> `remove_object`/`update_object`가 안정적으로 대상을 지목하려면 필요하고 도메인 전체
> (`stableObjectIds: true`) 관례와 일치하므로 추가한다.

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

### 신규 `commands/object-commands.ts`
`index-commands.ts` 패턴을 그대로 따른다.

```ts
export function addObject(doc, object: DiagramObject): DiagramDocument {
  return { ...doc, objects: [...(doc.objects ?? []), object] };
}
export function removeObject(doc, objectId: string): DiagramDocument {
  return { ...doc, objects: (doc.objects ?? []).filter((o) => o.id !== objectId) };
}
export function updateObject(
  doc, objectId: string,
  changes: Partial<Omit<DiagramObject, "id">>,
): DiagramDocument {
  return {
    ...doc,
    objects: (doc.objects ?? []).map((o) => (o.id === objectId ? { ...o, ...changes } : o)),
  };
}
```
- `src/index.ts`에서 `addObject/updateObject/removeObject`와 타입
  `DiagramObject`/`DiagramObjectKind` export.

### `schema/create-empty-diagram.ts`
- `views: []` 제거, `objects: []` 추가(신규 문서는 구체 빈 배열).

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

## views 제거 blast radius

`views: []`를 쓰는 모든 리터럴을 제거한다(전부 빈 배열, 읽는 `.views` 사용처 없음 →
동작 변화 0). TypeScript 빌드가 누락을 잡는다.

- `packages/domain/src/schema/create-empty-diagram.ts` (→ `objects: []`)
- `apps/web/src/shared/utils/exerd-parser.ts:132`
- `apps/web/src/shared/utils/ddl-parser.ts:627`
- `apps/api/src/modules/diagrams/services/diagrams-crud.service.ts:50`
- `apps/api/src/modules/collaboration/collaboration.service.spec.ts:17`
- `apps/api/src/modules/diagrams/diagrams.service.spec.ts:23`
- `apps/api/src/modules/ai/tools/tool-executor.spec.ts:29`
- `apps/api/src/modules/ai/context/context-builder.spec.ts:45`
- `apps/api/src/modules/ai/eval/fixtures.ts:13`

web 파서는 objects를 지금 파싱하지 않으므로(범위 밖) `objects`를 세팅하지 않는다
(optional). api는 content JSON을 통째로 저장하므로 로직 변경 불필요.

## 테스트

- `commands/object-commands.test.ts` — add/update/remove, `objects ?? []` 가드 케이스.
- `utils/ddl-generator` — objects가 DDL에 헤더+원문으로 append되고 `object_raw_sql`
  경고가 생기는지.
- `utils/format-diagram` — Objects 섹션 출력.
- `validation/validate-diagram` — 빈 sql / 이름 중복 error.
- `schema/create-empty-diagram` 기존 테스트의 기대값 `views` → `objects` 갱신.

## 범위 밖 (별도 이슈 권장)

- DDL **import** 시 `CREATE PROCEDURE/FUNCTION/TRIGGER/VIEW` 파싱 → `objects[]` 매핑.
  현재 DDL 파서는 web 전용(`apps/web/src/shared/utils/ddl-parser.ts`)이라 domain
  승격이 선행돼야 함.

## 리스크 / 주의

- 진행 중이라던 **웹 SQL-객체 PR**이 나중에 domain에 `objects`를 또 추가하면 충돌 가능.
  현재 그 PR이 없으므로 이 작업에서 기반을 확정하고, 등장 시 이 스펙 기준으로 정합.
- 객체 `sql`은 검증되지 않은 원문 → DDL 출력 시 항상 `object_raw_sql` 경고로 명시.
