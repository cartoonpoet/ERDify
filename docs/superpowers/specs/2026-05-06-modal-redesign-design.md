# Modal Redesign & MSSQL Support — Design Spec

**Date:** 2026-05-06  
**Scope:** ImportDiagramModal, ExportDdlModal, ExportOrmModal 리디자인 + MSSQL dialect 추가

---

## 1. Visual Direction

사용자가 제시한 레퍼런스 이미지 기준:

- **모달 프레임**: 라이트 (흰 배경, 기존 Modal 컴포넌트 유지)
- **Dialect 탭**: 언더라인 스타일 상단 탭 (MySQL | PostgreSQL | MariaDB | MSSQL)
- **코드 영역**: 다크 배경 (`#0d1821`) + 왼쪽 라인 번호 컬럼
- **Info 힌트**: 파란 tint 박스 (`rgba(0,100,224,0.07)` bg + `rgba(0,100,224,0.15)` border)
- **Footer 버튼**: 취소(라이트 border) + 주요 액션(파란 solid)

---

## 2. ImportDiagramModal

### 탭 구조 변경

현재: 상단 탭 = DDL입력 / ExERD파일, 하단 = dialect 드롭다운  
변경: 상단 탭 = MySQL | PostgreSQL | MariaDB | MSSQL | ExERD파일

- 첫 4개 탭: DDL 모드, 각 탭이 dialect를 결정
- 마지막 탭 "ExERD 파일": 파일 드롭존 모드

### DDL 모드 레이아웃

```
[MySQL] [PostgreSQL] [MariaDB] [MSSQL] [ExERD 파일]
─────────────────────────────────────────────────────
다이어그램 이름: [____________ 입력 ________________]
─────────────────────────────────────────────────────
SQL 불러넣기
CREATE TABLE 구문을 입력하면 자동으로 ERD가 생성됩니다.
┌──────────────────────────────────────────────────┐
│ 1 │ CREATE TABLE users (                          │  ← dark bg
│ 2 │   id INT NOT NULL AUTO_INCREMENT,             │
│ 3 │   ...                                         │
│   │                                               │
└──────────────────────────────────────────────────┘
[drag-drop .sql here hint]
──────────────────────────────────────────────────
✦ COMMENT는 논리명으로 자동 매핑됩니다.
  FK는 관계선으로 변환됩니다.
──────────────────────────────────────────────────
[취소]                            [ERD로 변환 →]
```

### 다이어그램 이름 자동 추론

우선순위:
1. .sql 파일 드롭 시 → 파일명(확장자 제거)
2. DDL 텍스트에서 첫 `CREATE TABLE <name>` 추출 (실시간, onChange)
3. 빈 상태 유지 — 변환 버튼 클릭 시 미입력이면 에러 표시

### 코드 에디터 구현 (라이브러리 없음)

- 컨테이너: `display: flex`, dark bg, border-radius
- 왼쪽: line number `<div>` — `value.split('\n').length`로 렌더링
- 오른쪽: `<textarea>` (투명 bg, 같은 폰트/라인 높이)
- 스크롤 동기화: `onScroll` 핸들러로 line number div scrollTop 동기화
- .sql 드래그앤드롭: textarea를 감싼 div에 `onDrop` 유지

### ExERD 모드

기존 드롭존 레이아웃 유지, CSS만 다크 테마 힌트에 맞게 조정. 이름 필드 공유.

### 버튼

"가져오기" → "ERD로 변환 →"

---

## 3. ExportDdlModal

### 레이아웃

```
Modal title: "DDL 내보내기"
─────────────────────────────────────────────────────
toolbar:  [diagram_name.sql]        [📋 복사] [⬇ 다운로드]
┌──────────────────────────────────────────────────┐
│ 1 │ CREATE TABLE "users" (                        │  ← dark
│ 2 │   "id" SERIAL NOT NULL,                       │
│   │ ...                                           │
└──────────────────────────────────────────────────┘
─────────────────────────────────────────────────────
[닫기]
```

- 코드 블록: 다크 bg + 라인 번호 (read-only `<pre>` 기반)
- 파일명: `{diagramName}.sql` 라벨 (toolbar 왼쪽)
- 복사 버튼: 성공 시 "✓ 복사됨" 2초 표시
- 다운로드 버튼: 기존 로직 유지

---

## 4. ExportOrmModal

### 레이아웃

```
Modal title: "ORM 코드 내보내기"
─────────────────────────────────────────────────────
[TypeORM] [Prisma] [SQLAlchemy]
─────────────────────────────────────────────────────
toolbar:  [schema.ts]              [📋 복사] [⬇ 다운로드]
┌──────────────────────────────────────────────────┐
│ 1 │ @Entity()                                     │  ← dark
│   │ ...                                           │
└──────────────────────────────────────────────────┘
```

- ORM 탭: 기존 탭 유지 (TypeORM | Prisma | SQLAlchemy)
- 파일명: `schema.{ext}` 라벨
- 코드 블록: 동일 다크 스타일 + 라인 번호

---

## 5. 공유 컴포넌트: DarkCodeEditor

세 모달이 동일한 다크 코드 에디터를 사용하므로 공유 컴포넌트로 추출.

### 위치
`apps/web/src/shared/components/DarkCodeEditor.tsx`  
`apps/web/src/shared/components/DarkCodeEditor.css.ts`

### Props
```typescript
interface DarkCodeEditorProps {
  value: string;
  onChange?: (v: string) => void;   // undefined이면 read-only
  onFileDrop?: (file: File) => void; // drag-drop 지원 시
  height?: string;                   // 기본 "220px"
  placeholder?: string;
}
```

### 동작
- `onChange` 있음 → `<textarea>` (editable)
- `onChange` 없음 → `<pre>` (read-only)
- 라인 번호: `value.split('\n').length`
- 스크롤: editable 모드에서 line number div와 동기화

---

## 6. MSSQL 지원

### packages/domain/src/types/diagram.type.ts
```typescript
export type DiagramDialect = "postgresql" | "mysql" | "mariadb" | "mssql";
```

### packages/domain/src/utils/ddl-generator.ts

`quote()` 함수 추가:
- `mssql`: `[name]` (bracket quoting)

컬럼 DDL:
- MSSQL은 `COMMENT` 미지원 → 생략
- IDENTITY(1,1) 별도 처리 없이 타입 pass-through (사용자가 T-SQL 타입 직접 입력)

### apps/web/src/shared/utils/ddl-parser.ts

MSSQL 파싱 추가:
- `[bracket]` 식별자 언쿼팅
- `NVARCHAR` → VARCHAR 매핑
- `INT IDENTITY` 패턴 인식 → primaryKey: true
- `GO` 구문 무시 (statement separator)
- `CONSTRAINT ... PRIMARY KEY` 지원 (현재 MySQL/PostgreSQL과 동일)

---

## 7. 변경 파일 목록

| 파일 | 변경 유형 |
|------|----------|
| `packages/domain/src/types/diagram.type.ts` | 수정 |
| `packages/domain/src/utils/ddl-generator.ts` | 수정 |
| `apps/web/src/shared/utils/ddl-parser.ts` | 수정 |
| `apps/web/src/shared/components/DarkCodeEditor.tsx` | 신규 |
| `apps/web/src/shared/components/DarkCodeEditor.css.ts` | 신규 |
| `apps/web/src/features/dashboard/components/ImportDiagramModal.tsx` | 수정 |
| `apps/web/src/features/dashboard/components/ImportDiagramModal.css.ts` | 수정 |
| `apps/web/src/features/editor/components/ExportDdlModal.tsx` | 수정 |
| `apps/web/src/features/editor/components/ExportDdlModal.css.ts` | 수정 |
| `apps/web/src/features/editor/components/ExportOrmModal.tsx` | 수정 |
| `apps/web/src/features/editor/components/export-orm-modal.css.ts` | 수정 |
