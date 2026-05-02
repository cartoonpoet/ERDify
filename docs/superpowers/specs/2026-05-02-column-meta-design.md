# 컬럼 메타 확장 설계 (논리명 · UNIQUE · INDEX)

**날짜:** 2026-05-02
**범위:** EditableTableNode 컬럼 행 전면 개편 + 인덱스 관리 섹션 + DDL COMMENT/INDEX 출력

---

## 1. 요구사항 요약

- 컬럼 편집 행을 한 줄로 통합: `PK · FK · NULL · UQ · 논리명 · 이름 · 타입 · 삭제`
- 논리명 = `DiagramColumn.comment` 필드 (기존 필드 재활용, 별도 comment 컬럼 없음)
- FK 표시: read-only 파란 점 (관계에서 자동 파생)
- 테이블 헤더에 테이블 논리명 입력 (`DiagramEntity.comment`)
- 테이블 하단 인덱스 섹션: 이름·컬럼 선택·UNIQUE·복합 인덱스 지원
- DDL 출력에 COMMENT 및 CREATE INDEX 반영

---

## 2. 데이터 모델

### 2-1. DiagramIndex (신규 타입)

```typescript
// packages/domain/src/types/diagram.type.ts
export interface DiagramIndex {
  id: string;
  entityId: string;
  name: string;
  columnIds: string[];  // 순서 있음, 복합 인덱스 지원
  unique: boolean;
}
```

### 2-2. DiagramDocument.indexes

기존에 `indexes: []`로 예약된 필드를 `DiagramIndex[]` 타입으로 채움:

```typescript
export interface DiagramDocument {
  // ... 기존 필드
  indexes: DiagramIndex[];  // [] → DiagramIndex[]
}
```

### 2-3. DiagramColumn (변경 없음)

`comment: string | null` — 논리명으로 활용. `unique: boolean` — UQ 체크박스에 연결.

### 2-4. DiagramEntity (변경 없음)

`comment: string | null` — 테이블 논리명으로 활용.

---

## 3. 커맨드

### 3-1. 신규: updateEntityComment

```typescript
// packages/domain/src/commands/entity-commands.ts
export function updateEntityComment(
  doc: DiagramDocument,
  entityId: string,
  comment: string | null
): DiagramDocument
```

### 3-2. 신규: addIndex / removeIndex / updateIndex

```typescript
// packages/domain/src/commands/index-commands.ts
export function addIndex(
  doc: DiagramDocument,
  index: DiagramIndex
): DiagramDocument

export function removeIndex(
  doc: DiagramDocument,
  indexId: string
): DiagramDocument

export function updateIndex(
  doc: DiagramDocument,
  indexId: string,
  changes: Partial<Omit<DiagramIndex, "id" | "entityId">>
): DiagramDocument
```

### 3-3. 기존 updateColumn — 변경 없음

`Partial<Omit<DiagramColumn, "id">>` 를 이미 지원하므로 `comment`, `unique`, `nullable` 모두 그대로 처리.

### 3-4. 기존 removeColumn — 인덱스 정리 추가

컬럼 삭제 시 해당 컬럼을 참조하는 인덱스도 정리:
- `columnIds`에서 해당 columnId 제거
- `columnIds`가 빈 배열이 된 인덱스는 인덱스 자체를 삭제

### 3-5. 기존 removeEntity — 인덱스 정리 추가

엔티티 삭제 시 `entityId`가 일치하는 인덱스 전부 삭제.

---

## 4. UI (EditableTableNode 개편)

### 4-1. 테이블 헤더

```
[색상 스와치] [테이블명 input] [논리명 italic input — entity.comment] [삭제 버튼]
```

- 논리명은 italic 스타일, placeholder `"논리명 (선택)"`
- `updateEntityComment` 커맨드 사용

### 4-2. 컬럼 행 (편집 모드)

헤더 레이블 행:
```
PK | FK | NULL | UQ | 논리명 | 컬럼명 | 타입 | [삭제]
```

각 셀:
| 셀 | 너비 | 편집 | 연결 필드 |
|---|---|---|---|
| PK | 28px | checkbox | `column.primaryKey` |
| FK | 28px | read-only 파란 점 | 관계 파생 |
| NULL | 28px | checkbox | `column.nullable` |
| UQ | 28px | checkbox | `column.unique` |
| 논리명 | flex:1 | text input (italic) | `column.comment` |
| 컬럼명 | flex:1 | text input | `column.name` |
| 타입 | 88px | TypeSelect (기존) | `column.type` |
| 삭제 | 18px | × 버튼 | `removeColumn` |

FK 파생 규칙: `doc.relationships`에서 `sourceColumnIds` 또는 `targetColumnIds`에 해당 column.id가 포함되면 FK 표시.

### 4-3. 읽기 전용 모드 (canEdit=false)

기존 읽기 전용 렌더링에서:
- 컬럼 행에 논리명(comment) 있으면 이름 아래 italic으로 표시
- FK 파란 점 표시 추가
- UQ 배지 표시 추가

### 4-4. 인덱스 섹션 (편집 모드)

컬럼 목록 아래, 점선 구분선 후:

```
─────── INDEXES ─────── [+ 추가]

[idx_name input] [컬럼 선택 멀티] [UNIQUE toggle] [×]
[idx_name input] [컬럼 선택 멀티] [UNIQUE toggle] [×]
```

- 컬럼 선택: 해당 엔티티의 컬럼 목록에서 멀티 선택 (체크박스 드롭다운)
- UNIQUE 토글: 클릭 시 `INDEX ↔ UNIQUE` 전환
- `+ 추가`: `addIndex` 커맨드, 기본값 `{ name: "", columnIds: [], unique: false }`
- × 버튼: `removeIndex` 커맨드

인덱스 이름 자동 생성 기본값: `idx_{entityName}_{firstColName}`

### 4-5. CSS 파일

편집 관련 스타일 추가:
- `apps/web/src/features/editor/components/editable-table-node.css.ts`

---

## 5. DDL 출력

### 5-1. PostgreSQL

```sql
CREATE TABLE "users" (
  "id" uuid NOT NULL,
  "email" varchar(255) NOT NULL,
  "project_id" uuid,
  PRIMARY KEY ("id")
);

COMMENT ON TABLE "users" IS '사용자 기본 정보 테이블';
COMMENT ON COLUMN "users"."id" IS '사용자 고유 식별자';
COMMENT ON COLUMN "users"."email" IS '로그인 이메일';

CREATE INDEX "idx_users_project_id" ON "users" ("project_id");
CREATE UNIQUE INDEX "uq_users_email" ON "users" ("email");
```

규칙:
- `entity.comment`가 있을 때만 `COMMENT ON TABLE` 출력
- `column.comment`가 있는 컬럼만 `COMMENT ON COLUMN` 출력
- `COMMENT ON ...` 블록은 해당 테이블의 `CREATE TABLE` 바로 뒤에 위치

### 5-2. MySQL / MariaDB

```sql
CREATE TABLE `users` (
  `id` varchar(36) NOT NULL,
  `email` varchar(255) NOT NULL COMMENT '로그인 이메일',
  `project_id` varchar(36),
  PRIMARY KEY (`id`)
) COMMENT='사용자 기본 정보 테이블';

CREATE INDEX `idx_users_project_id` ON `users` (`project_id`);
CREATE UNIQUE INDEX `uq_users_email` ON `users` (`email`);
```

규칙:
- 컬럼 comment는 컬럼 정의 끝에 `COMMENT '...'` 인라인
- 테이블 comment는 `) COMMENT='...'` 로 닫음
- `comment`가 `null`이면 해당 구문 생략

---

## 6. 파일 구조

```
packages/domain/src/
  types/diagram.type.ts              -- DiagramIndex 타입 추가, indexes: DiagramIndex[]
  commands/entity-commands.ts        -- updateEntityComment 추가, removeEntity에 인덱스 정리 추가
  commands/column-commands.ts        -- removeColumn에 인덱스 정리 추가
  commands/index-commands.ts         -- addIndex / removeIndex / updateIndex (신규)
  utils/ddl-generator.ts             -- COMMENT + CREATE INDEX 출력 추가
  index.ts                           -- 신규 export 추가

apps/web/src/features/editor/components/
  EditableTableNode.tsx              -- 전면 개편
  editable-table-node.css.ts         -- 신규 스타일 추가
```

---

## 7. 범위 외

- 인덱스 캔버스 시각화 (ERD 다이어그램에 인덱스 표시)
- 함수 인덱스 (expression index)
- 인덱스 정렬 방향 (ASC/DESC per column)
- PARTIAL INDEX (WHERE 조건)
