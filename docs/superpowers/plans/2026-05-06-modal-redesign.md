# Modal Redesign & MSSQL Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 세 모달(ImportDiagramModal, ExportDdlModal, ExportOrmModal)을 다크 코드 에디터 스타일로 리디자인하고 MSSQL dialect를 추가한다.

**Architecture:** 공유 `DarkCodeEditor` 컴포넌트(editable/read-only 모드 겸용)를 만들어 세 모달이 재사용한다. MSSQL 지원은 `packages/domain` 레벨(타입·생성기)과 `apps/web` 레벨(파서)에 각각 추가한다.

**Tech Stack:** React, vanilla-extract CSS, Vitest(packages/domain 테스트), 외부 syntax-highlight 라이브러리 없음

---

## File Map

| 파일 | 역할 |
|------|------|
| `packages/domain/src/types/diagram.type.ts` | `DiagramDialect`에 `"mssql"` 추가 |
| `packages/domain/src/utils/ddl-generator.ts` | MSSQL bracket quoting, COMMENT 생략 |
| `packages/domain/src/utils/ddl-generator.test.ts` | MSSQL 생성 테스트 추가 |
| `apps/web/src/shared/utils/ddl-parser.ts` | MSSQL bracket 언쿼팅, GO 무시, IDENTITY 인식 |
| `apps/web/src/shared/components/DarkCodeEditor.tsx` | **신규** — 다크 에디터 컴포넌트 |
| `apps/web/src/shared/components/DarkCodeEditor.css.ts` | **신규** — 에디터 스타일 |
| `apps/web/src/features/dashboard/components/ImportDiagramModal.tsx` | dialect 탭, 다크 에디터, 이름 자동 추론 |
| `apps/web/src/features/dashboard/components/ImportDiagramModal.css.ts` | 라이트 모달 + 힌트 박스 스타일 |
| `apps/web/src/features/editor/components/ExportDdlModal.tsx` | 다크 코드 블록, 파일명 라벨 |
| `apps/web/src/features/editor/components/ExportDdlModal.css.ts` | 다크 코드 블록 스타일 |
| `apps/web/src/features/editor/components/ExportOrmModal.tsx` | 다크 코드 블록, 파일명 라벨 |
| `apps/web/src/features/editor/components/export-orm-modal.css.ts` | 다크 코드 블록 스타일 |

---

## Task 1: DiagramDialect에 MSSQL 추가

**Files:**
- Modify: `packages/domain/src/types/diagram.type.ts`

- [ ] **Step 1: `DiagramDialect` 타입 수정**

`packages/domain/src/types/diagram.type.ts` 의 첫 줄을:

```typescript
export type DiagramDialect = "postgresql" | "mysql" | "mariadb" | "mssql";
```

- [ ] **Step 2: 빌드 확인**

```bash
cd /path/to/repo && pnpm --filter @erdify/domain build
```

Expected: 타입 에러 없이 빌드 성공 (ddl-generator.ts의 switch에 mssql case가 없으면 TypeScript가 경고할 수 있음 — Task 2에서 처리).

- [ ] **Step 3: Commit**

```bash
git add packages/domain/src/types/diagram.type.ts
git commit -m "feat(domain): add mssql to DiagramDialect"
```

---

## Task 2: DDL Generator — MSSQL 지원

**Files:**
- Modify: `packages/domain/src/utils/ddl-generator.ts`
- Modify: `packages/domain/src/utils/ddl-generator.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`packages/domain/src/utils/ddl-generator.test.ts` 끝에 추가:

```typescript
describe("generateDdl — MSSQL", () => {
  it("uses bracket quoting for identifiers", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "mssql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "INT" }));
    const ddl = generateDdl(doc);
    expect(ddl).toContain("CREATE TABLE [users]");
    expect(ddl).toContain("[id]");
  });

  it("omits COMMENT for MSSQL", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "mssql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = updateEntityComment(doc, "e1", "사용자 테이블");
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "INT" }));
    const ddl = generateDdl(doc);
    expect(ddl).not.toContain("COMMENT");
  });

  it("uses bracket quoting in FK ALTER TABLE", () => {
    let doc = createEmptyDiagram({ id: "d1", name: "T", dialect: "mssql" });
    doc = addEntity(doc, { id: "e1", name: "users" });
    doc = addColumn(doc, "e1", col({ id: "c1", name: "id", type: "INT", primaryKey: true }));
    doc = addEntity(doc, { id: "e2", name: "posts" });
    doc = addColumn(doc, "e2", col({ id: "c2", name: "user_id", type: "INT", primaryKey: false }));
    // addRelationship을 파일 상단 import에 추가: import { addRelationship } from "../commands/relationship-commands.js";
    doc = addRelationship(doc, {
      id: "r1", name: "fk_posts_user",
      sourceEntityId: "e2", sourceColumnIds: ["c2"],
      targetEntityId: "e1", targetColumnIds: ["c1"],
      cardinality: "many-to-one", onDelete: "no-action", onUpdate: "no-action", identifying: false,
    });
    const ddl = generateDdl(doc);
    expect(ddl).toContain("ALTER TABLE [posts]");
    expect(ddl).toContain("REFERENCES [users]");
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

```bash
cd packages/domain && pnpm test -- --reporter=verbose 2>&1 | grep -A3 "MSSQL"
```

Expected: FAIL — `[users]` 대신 backtick 또는 다른 quoting 사용

- [ ] **Step 3: `ddl-generator.ts`의 `quote` 함수 수정**

```typescript
function quote(name: string, dialect: DiagramDocument["dialect"]): string {
  if (dialect === "postgresql") return `"${name}"`;
  if (dialect === "mssql") return `[${name}]`;
  return `\`${name}\``;
}
```

- [ ] **Step 4: `columnDdl` — MSSQL에서 COMMENT 생략**

기존 코드:
```typescript
if (col.comment && dialect !== "postgresql") {
  parts.push(`COMMENT '${escapeComment(col.comment)}'`);
}
```

수정:
```typescript
if (col.comment && dialect !== "postgresql" && dialect !== "mssql") {
  parts.push(`COMMENT '${escapeComment(col.comment)}'`);
}
```

- [ ] **Step 5: `entityDdl` — MSSQL에서 테이블 COMMENT 생략**

기존:
```typescript
if (entity.comment && dialect !== "postgresql") {
  lines.push(`) COMMENT='${escapeComment(entity.comment)}';`);
} else {
  lines.push(");");
}
```

수정:
```typescript
if (entity.comment && dialect !== "postgresql" && dialect !== "mssql") {
  lines.push(`) COMMENT='${escapeComment(entity.comment)}';`);
} else {
  lines.push(");");
}
```

- [ ] **Step 6: 테스트 통과 확인**

```bash
cd packages/domain && pnpm test -- --reporter=verbose 2>&1 | grep -E "PASS|FAIL|MSSQL"
```

Expected: 모든 MSSQL 테스트 PASS, 기존 테스트도 모두 PASS

- [ ] **Step 7: Commit**

```bash
git add packages/domain/src/utils/ddl-generator.ts packages/domain/src/utils/ddl-generator.test.ts
git commit -m "feat(domain): add MSSQL support to ddl-generator (bracket quoting, no COMMENT)"
```

---

## Task 3: DDL Parser — MSSQL 지원

**Files:**
- Modify: `apps/web/src/shared/utils/ddl-parser.ts`

MSSQL T-SQL에서는:
1. 식별자에 `[bracket]` quoting 사용
2. `GO` 키워드가 statement separator로 쓰임 (세미콜론 없이)
3. `IDENTITY(1,1)` 패턴으로 auto-increment 표현

현재 파서는 이미 `stripIdentifierQuotes`로 `"`, `'`, `` ` `` 를 처리하지만 `[`/`]` 는 처리하지 않는다.

- [ ] **Step 1: `stripIdentifierQuotes` 함수에 bracket 지원 추가**

`apps/web/src/shared/utils/ddl-parser.ts`의 `stripIdentifierQuotes` 함수:

```typescript
function stripIdentifierQuotes(s: string): string {
  // Handle [bracket] quoting (MSSQL)
  if (s.startsWith("[") && s.endsWith("]")) return s.slice(1, -1);
  return s.replace(/^["'`]|["'`]$/g, "");
}
```

- [ ] **Step 2: `parseDdl`에서 `GO` 구문 처리**

`parseDdl` 함수 내 statements 분리 부분:

```typescript
// 기존
const statements = cleaned.split(";").map((s) => s.trim()).filter(Boolean);
```

수정:

```typescript
// GO는 MSSQL batch separator — 세미콜론과 동일하게 처리
const rawStatements = cleaned.split(/;|^\s*GO\s*$/im);
const statements = rawStatements.map((s) => s.trim()).filter(Boolean);
```

- [ ] **Step 3: MSSQL `IDENTITY` 컬럼 인식**

`parseColumnType`은 타입 문자열을 추출하는 역할만 한다. IDENTITY 정보는 컬럼 속성에서 추가로 파싱해야 한다. `parseCreateTable` 내에서 컬럼을 파싱한 후 IDENTITY 컬럼을 PK로 인식하는 로직 추가.

`apps/web/src/shared/utils/ddl-parser.ts`에서 컬럼 파싱 부분(`parseColumn` 또는 인라인)에서 다음 패턴을 감지:

```typescript
// IDENTITY(seed, increment) 패턴 감지 → primaryKey 힌트로 활용
const identityMatch = rawLine.match(/\bIDENTITY\s*\(\s*\d+\s*,\s*\d+\s*\)/i);
if (identityMatch) {
  colDef.primaryKey = true;
}
```

이 로직을 컬럼 파싱 결과 후처리 시 적용.

- [ ] **Step 4: MSSQL 파싱 수동 검증**

파서에 단위 테스트 파일은 없으므로 브라우저에서 직접 검증한다. 대신 아래 형태가 올바르게 파싱되는지 ImportDiagramModal에서 확인:

```sql
CREATE TABLE [dbo].[users] (
  [id] INT IDENTITY(1,1) NOT NULL,
  [name] NVARCHAR(100) NOT NULL,
  PRIMARY KEY ([id])
)
GO

CREATE TABLE [dbo].[posts] (
  [id] INT IDENTITY(1,1) NOT NULL,
  [user_id] INT NOT NULL,
  PRIMARY KEY ([id]),
  CONSTRAINT [fk_posts_user] FOREIGN KEY ([user_id])
    REFERENCES [dbo].[users] ([id])
    ON DELETE NO ACTION
)
GO
```

예상 결과: users, posts 두 테이블이 ERD로 변환되고 FK 관계선이 표시됨.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/shared/utils/ddl-parser.ts
git commit -m "feat(web): add MSSQL support to ddl-parser (bracket quoting, GO separator, IDENTITY)"
```

---

## Task 4: DarkCodeEditor 공유 컴포넌트 생성

**Files:**
- Create: `apps/web/src/shared/components/DarkCodeEditor.tsx`
- Create: `apps/web/src/shared/components/DarkCodeEditor.css.ts`

다크 배경 + 왼쪽 라인 번호 컬럼. `onChange`가 있으면 editable(`<textarea>`), 없으면 read-only(`<pre>`).

- [ ] **Step 1: CSS 파일 생성**

`apps/web/src/shared/components/DarkCodeEditor.css.ts`:

```typescript
import { style } from "@vanilla-extract/css";

export const container = style({
  display: "flex",
  background: "#0d1821",
  borderRadius: "8px",
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.06)",
  fontFamily: "var(--font-mono, 'Courier New', 'Consolas', monospace)",
  fontSize: "12px",
  lineHeight: "1.7",
  position: "relative",
});

export const lineNumbers = style({
  padding: "12px 0",
  minWidth: "40px",
  textAlign: "right",
  paddingRight: "10px",
  paddingLeft: "8px",
  background: "#0a141c",
  color: "rgba(255,255,255,0.2)",
  userSelect: "none",
  flexShrink: 0,
  overflowY: "hidden",
});

export const lineNumber = style({
  display: "block",
  lineHeight: "1.7",
});

export const codeArea = style({
  flex: 1,
  padding: "12px",
  overflowX: "auto",
  overflowY: "auto",
  color: "#7dd3fc",
  whiteSpace: "pre",
  margin: 0,
});

export const editableArea = style({
  flex: 1,
  padding: "12px",
  background: "transparent",
  border: "none",
  outline: "none",
  resize: "none",
  color: "#7dd3fc",
  fontFamily: "var(--font-mono, 'Courier New', 'Consolas', monospace)",
  fontSize: "12px",
  lineHeight: "1.7",
  overflowX: "auto",
  overflowY: "auto",
  whiteSpace: "pre",
  boxSizing: "border-box",
});

export const dragOverlay = style({
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(0,100,224,0.15)",
  border: "2px dashed rgba(0,100,224,0.6)",
  borderRadius: "8px",
  color: "rgba(255,255,255,0.7)",
  fontSize: "13px",
  pointerEvents: "none",
});
```

- [ ] **Step 2: 컴포넌트 파일 생성**

`apps/web/src/shared/components/DarkCodeEditor.tsx`:

```typescript
import { useRef, useCallback } from "react";
import type { DragEvent } from "react";
import * as css from "./DarkCodeEditor.css";

interface DarkCodeEditorProps {
  value: string;
  onChange?: (v: string) => void;
  onFileDrop?: (file: File) => void;
  height?: string;
  placeholder?: string;
  isDragOver?: boolean;
  onDragOver?: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave?: () => void;
  onDrop?: (e: DragEvent<HTMLDivElement>) => void;
}

export const DarkCodeEditor = ({
  value,
  onChange,
  onFileDrop,
  height = "220px",
  placeholder,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
}: DarkCodeEditorProps) => {
  const lineNumRef = useRef<HTMLDivElement>(null);
  const lineCount = value ? value.split("\n").length : 1;

  const handleScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumRef.current) {
      lineNumRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    onDrop?.(e);
    if (!e.defaultPrevented && onFileDrop) {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) onFileDrop(file);
    }
  }, [onDrop, onFileDrop]);

  return (
    <div
      className={css.container}
      style={{ height }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={handleDrop}
    >
      <div ref={lineNumRef} className={css.lineNumbers}>
        {Array.from({ length: lineCount }, (_, i) => (
          <span key={i} className={css.lineNumber}>{i + 1}</span>
        ))}
      </div>

      {onChange ? (
        <textarea
          className={css.editableArea}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          placeholder={placeholder}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
        />
      ) : (
        <pre className={css.codeArea}>{value || <span style={{ opacity: 0.3 }}>{placeholder}</span>}</pre>
      )}

      {isDragOver && (
        <div className={css.dragOverlay}>.sql 파일을 놓으세요</div>
      )}
    </div>
  );
};
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/shared/components/DarkCodeEditor.tsx apps/web/src/shared/components/DarkCodeEditor.css.ts
git commit -m "feat(web): add DarkCodeEditor shared component"
```

---

## Task 5: ImportDiagramModal 리디자인

**Files:**
- Modify: `apps/web/src/features/dashboard/components/ImportDiagramModal.tsx`
- Modify: `apps/web/src/features/dashboard/components/ImportDiagramModal.css.ts`

변경 사항:
- 탭을 dialect 탭(MySQL/PostgreSQL/MariaDB/MSSQL) + ExERD탭으로 재구성
- 이름 필드 유지 (DDL에서 자동 추론)
- 다크 코드 에디터 적용
- 힌트 박스 추가

- [ ] **Step 1: CSS 파일 전면 교체**

`apps/web/src/features/dashboard/components/ImportDiagramModal.css.ts` 내용 전체 교체:

```typescript
import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const tabRow = style({
  display: "flex",
  borderBottom: `1px solid ${vars.color.border}`,
  marginBottom: vars.space["4"],
  gap: 0,
});

export const tab = style({
  padding: `${vars.space["2"]} ${vars.space["4"]}`,
  fontSize: "13px",
  fontWeight: "500",
  cursor: "pointer",
  border: "none",
  background: "transparent",
  color: vars.color.textSecondary,
  fontFamily: vars.font.family,
  borderBottom: "2px solid transparent",
  marginBottom: "-1px",
  transition: "color 150ms ease, border-color 150ms ease",
  selectors: {
    "&:hover": { color: vars.color.textPrimary },
  },
});

export const tabActive = style({
  color: vars.color.primary,
  borderBottomColor: vars.color.primary,
  fontWeight: "600",
});

export const nameField = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space["1"],
  marginBottom: vars.space["3"],
});

export const fieldLabel = style({
  fontSize: "12px",
  fontWeight: "600",
  color: vars.color.textSecondary,
  letterSpacing: "0.3px",
  textTransform: "uppercase",
});

export const textInput = style({
  height: "36px",
  padding: `0 ${vars.space["3"]}`,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  fontSize: "14px",
  color: vars.color.textPrimary,
  background: vars.color.surface,
  fontFamily: vars.font.family,
  outline: "none",
  selectors: {
    "&:focus": { borderColor: vars.color.primary, boxShadow: `0 0 0 3px ${vars.color.primary}22` },
  },
});

export const sectionHeader = style({
  marginBottom: vars.space["2"],
});

export const sectionTitle = style({
  fontSize: "14px",
  fontWeight: "600",
  color: vars.color.textPrimary,
  marginBottom: "2px",
});

export const sectionDesc = style({
  fontSize: "12px",
  color: vars.color.textSecondary,
});

export const hintBox = style({
  display: "flex",
  alignItems: "flex-start",
  gap: vars.space["2"],
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  background: "rgba(0,100,224,0.07)",
  border: "1px solid rgba(0,100,224,0.15)",
  borderRadius: vars.radius.md,
  marginTop: vars.space["3"],
  fontSize: "12px",
  color: vars.color.textSecondary,
});

export const hintIcon = style({
  color: vars.color.primary,
  fontSize: "14px",
  flexShrink: 0,
  marginTop: "1px",
});

// ExERD tab styles (reused from current implementation)
export const dropzone = style({
  border: `2px dashed ${vars.color.borderStrong}`,
  borderRadius: vars.radius.lg,
  padding: vars.space["6"],
  textAlign: "center",
  cursor: "pointer",
  color: vars.color.textSecondary,
  fontSize: "13px",
  transition: "border-color 150ms ease, background 150ms ease",
  selectors: {
    "&:hover": {
      borderColor: vars.color.primary,
      background: `${vars.color.primary}08`,
    },
  },
});

export const dropzoneActive = style({
  borderColor: vars.color.primary,
  background: `${vars.color.primary}08`,
});

export const dropzoneIcon = style({
  fontSize: "28px",
  marginBottom: vars.space["2"],
});

export const dropzoneHint = style({
  fontSize: "11px",
  color: vars.color.textSecondary,
  marginTop: vars.space["1"],
});

export const fileChosen = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  background: vars.color.surfaceSecondary,
  borderRadius: vars.radius.md,
  fontSize: "13px",
  color: vars.color.textPrimary,
  marginTop: vars.space["2"],
});

export const fileChosenName = style({
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const fileClearBtn = style({
  background: "none",
  border: "none",
  color: vars.color.textSecondary,
  cursor: "pointer",
  fontSize: "16px",
  lineHeight: 1,
  padding: 0,
  selectors: { "&:hover": { color: vars.color.error } },
});

export const errorText = style({
  fontSize: "12px",
  color: vars.color.error,
  marginTop: vars.space["1"],
});

export const footer = style({
  display: "flex",
  justifyContent: "flex-end",
  gap: vars.space["2"],
  marginTop: vars.space["4"],
  paddingTop: vars.space["4"],
  borderTop: `1px solid ${vars.color.border}`,
});

export const cancelBtn = style({
  padding: `${vars.space["2"]} ${vars.space["4"]}`,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  background: vars.color.surface,
  color: vars.color.textSecondary,
  fontSize: "14px",
  fontWeight: "500",
  cursor: "pointer",
  fontFamily: vars.font.family,
  selectors: { "&:hover": { background: vars.color.surfaceSecondary } },
});
```

- [ ] **Step 2: TSX 파일 전면 교체**

`apps/web/src/features/dashboard/components/ImportDiagramModal.tsx` 내용 전체 교체:

```typescript
import { randomUUID } from "../../../shared/utils/uuid";
import { useState, useRef } from "react";
import type { DragEvent, ChangeEvent } from "react";
import { Modal, Button } from "../../../design-system";
import { createDiagram } from "../../../shared/api/diagrams.api";
import { parseDdl } from "../../../shared/utils/ddl-parser";
import { parseExerd } from "../../../shared/utils/exerd-parser";
import { DarkCodeEditor } from "../../../shared/components/DarkCodeEditor";
import type { DiagramDialect } from "@erdify/domain";
import {
  tabRow, tab, tabActive,
  nameField, fieldLabel, textInput,
  sectionHeader, sectionTitle, sectionDesc,
  hintBox, hintIcon,
  dropzone, dropzoneActive, dropzoneIcon, dropzoneHint,
  fileChosen, fileChosenName, fileClearBtn,
  errorText, footer, cancelBtn,
} from "./ImportDiagramModal.css";

type TabType = DiagramDialect | "exerd";

const DIALECT_TABS: { label: string; value: DiagramDialect }[] = [
  { label: "MySQL", value: "mysql" },
  { label: "PostgreSQL", value: "postgresql" },
  { label: "MariaDB", value: "mariadb" },
  { label: "MSSQL", value: "mssql" },
];

interface ImportDiagramModalProps {
  open: boolean;
  projectId: string;
  onClose: () => void;
  onImported: (diagramId: string) => void;
}

function extractFirstTableName(sql: string): string | null {
  const m = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:\[?[\w.]+\]?\.)?[\["`]?([\w]+)[\]"`]?\s*\(/i);
  return m ? m[1] ?? null : null;
}

export const ImportDiagramModal = ({ open, projectId, onClose, onImported }: ImportDiagramModalProps) => {
  const [activeTab, setActiveTab] = useState<TabType>("mysql");
  const [name, setName] = useState("");
  const [exerdFile, setExerdFile] = useState<File | null>(null);
  const [ddlText, setDdlText] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDdlDragOver, setIsDdlDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sqlFileInputRef = useRef<HTMLInputElement>(null);

  const dialect: DiagramDialect = activeTab === "exerd" ? "mysql" : activeTab;

  function handleTabSwitch(t: TabType) {
    setActiveTab(t);
    setError(null);
  }

  function handleDdlChange(v: string) {
    setDdlText(v);
    if (!name) {
      const detected = extractFirstTableName(v);
      if (detected) setName(detected);
    }
  }

  const acceptSqlFile = async (file: File) => {
    if (!file.name.endsWith(".sql")) {
      setError(".sql 파일만 지원합니다.");
      return;
    }
    const text = await file.text();
    setDdlText(text);
    if (!name) setName(file.name.replace(/\.sql$/, ""));
    setError(null);
  };

  const handleSqlFileDrop = (file: File) => {
    acceptSqlFile(file);
  };

  const handleSqlFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) acceptSqlFile(file);
    e.target.value = "";
  };

  function acceptExerdFile(file: File) {
    if (!file.name.endsWith(".exerd") && !file.name.endsWith(".xml")) {
      setError(".exerd 또는 .xml 파일만 지원합니다.");
      return;
    }
    setExerdFile(file);
    if (!name) setName(file.name.replace(/\.(exerd|xml)$/, ""));
    setError(null);
  }

  function handleExerdDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) acceptExerdFile(file);
  }

  function handleExerdDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleExerdFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file) acceptExerdFile(file);
  }

  function handleClearExerdFile() {
    setExerdFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit() {
    setError(null);
    const diagramName = name.trim();
    if (!diagramName) {
      setError("다이어그램 이름을 입력하세요.");
      return;
    }
    if (activeTab === "exerd" && !exerdFile) {
      setError("ExERD 파일을 선택하세요.");
      return;
    }
    if (activeTab !== "exerd" && !ddlText.trim()) {
      setError("DDL SQL을 입력하세요.");
      return;
    }

    setLoading(true);
    try {
      let content: object;
      if (activeTab === "exerd") {
        const xmlText = await exerdFile!.text();
        const parsed = parseExerd(xmlText);
        const now = new Date().toISOString();
        content = {
          format: "erdify.schema.v1",
          id: randomUUID(),
          name: diagramName,
          dialect: "mysql",
          ...parsed,
          metadata: { revision: 1, stableObjectIds: true, createdAt: now, updatedAt: now },
        };
      } else {
        content = parseDdl(ddlText, dialect);
      }
      const created = await createDiagram(projectId, { name: diagramName, dialect, content });
      onImported(created.id);
      onClose();
      resetState();
    } catch (e) {
      setError(e instanceof Error ? e.message : "가져오기에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function resetState() {
    setName("");
    setActiveTab("mysql");
    setExerdFile(null);
    setDdlText("");
    setError(null);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  const canSubmit = !loading && !!name.trim() &&
    (activeTab === "exerd" ? !!exerdFile : !!ddlText.trim());

  return (
    <Modal open={open} onClose={handleClose} title="DDL 가져오기">
      {/* Dialect / ExERD tabs */}
      <div className={tabRow}>
        {DIALECT_TABS.map((t) => (
          <button
            key={t.value}
            className={[tab, activeTab === t.value ? tabActive : ""].join(" ")}
            onClick={() => handleTabSwitch(t.value)}
            type="button"
          >
            {t.label}
          </button>
        ))}
        <button
          className={[tab, activeTab === "exerd" ? tabActive : ""].join(" ")}
          onClick={() => handleTabSwitch("exerd")}
          type="button"
        >
          ExERD 파일
        </button>
      </div>

      {/* Name field */}
      <div className={nameField}>
        <label className={fieldLabel} htmlFor="import-name">다이어그램 이름</label>
        <input
          id="import-name"
          className={textInput}
          placeholder="예: 회원 서비스 ERD"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      {activeTab !== "exerd" ? (
        <>
          <div className={sectionHeader}>
            <div className={sectionTitle}>SQL 불러넣기</div>
            <div className={sectionDesc}>CREATE TABLE 구문을 입력하면 자동으로 ERD가 생성됩니다.</div>
          </div>
          <DarkCodeEditor
            value={ddlText}
            onChange={handleDdlChange}
            onFileDrop={handleSqlFileDrop}
            height="220px"
            placeholder={"CREATE TABLE users (\n  id INT NOT NULL,\n  name VARCHAR(100)\n);"}
            isDragOver={isDdlDragOver}
            onDragOver={(e) => { e.preventDefault(); setIsDdlDragOver(true); }}
            onDragLeave={() => setIsDdlDragOver(false)}
          />
          <input
            ref={sqlFileInputRef}
            type="file"
            accept=".sql"
            style={{ display: "none" }}
            onChange={handleSqlFileChange}
          />
          <div className={hintBox}>
            <span className={hintIcon}>✦</span>
            <span>COMMENT는 논리명으로 자동 매핑됩니다. FK는 관계선으로 변환됩니다.</span>
          </div>
        </>
      ) : (
        <div>
          <div
            className={[dropzone, isDragOver ? dropzoneActive : ""].join(" ")}
            onDrop={handleExerdDrop}
            onDragOver={handleExerdDragOver}
            onDragLeave={() => setIsDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
          >
            <div className={dropzoneIcon}>📂</div>
            <div>클릭하거나 파일을 여기에 끌어다 놓으세요</div>
            <div className={dropzoneHint}>.exerd, .xml 파일 지원</div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".exerd,.xml"
            style={{ display: "none" }}
            onChange={handleExerdFileChange}
          />
          {exerdFile && (
            <div className={fileChosen}>
              <span className={fileChosenName}>{exerdFile.name}</span>
              <button className={fileClearBtn} onClick={handleClearExerdFile} type="button" aria-label="파일 제거">×</button>
            </div>
          )}
        </div>
      )}

      {error && <div className={errorText}>{error}</div>}

      <div className={footer}>
        <button className={cancelBtn} onClick={handleClose} type="button">취소</button>
        <Button variant="primary" size="md" onClick={handleSubmit} disabled={!canSubmit}>
          {loading ? "변환 중..." : "ERD로 변환 →"}
        </Button>
      </div>
    </Modal>
  );
};
```

- [ ] **Step 3: TypeScript 타입 에러 확인**

```bash
cd apps/web && pnpm tsc --noEmit 2>&1 | grep "ImportDiagramModal"
```

Expected: 에러 없음

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/dashboard/components/ImportDiagramModal.tsx \
        apps/web/src/features/dashboard/components/ImportDiagramModal.css.ts
git commit -m "feat(web): redesign ImportDiagramModal with dialect tabs and dark code editor"
```

---

## Task 6: ExportDdlModal 리디자인

**Files:**
- Modify: `apps/web/src/features/editor/components/ExportDdlModal.tsx`
- Modify: `apps/web/src/features/editor/components/ExportDdlModal.css.ts`

- [ ] **Step 1: CSS 파일 교체**

`apps/web/src/features/editor/components/ExportDdlModal.css.ts` 전체 교체:

```typescript
import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const body = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space["3"],
});

export const toolbar = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: vars.space["2"],
});

export const filenameLabel = style({
  fontSize: "12px",
  fontWeight: "600",
  color: vars.color.textSecondary,
  fontFamily: "var(--font-mono, 'Courier New', monospace)",
  background: vars.color.surfaceSecondary,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  padding: `2px ${vars.space["2"]}`,
});

export const toolbarBtns = style({
  display: "flex",
  gap: vars.space["2"],
});

export const actionBtn = style({
  padding: `${vars.space["1"]} ${vars.space["3"]}`,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  background: vars.color.surface,
  color: vars.color.textSecondary,
  fontSize: "12px",
  fontWeight: "500",
  cursor: "pointer",
  fontFamily: vars.font.family,
  transition: "background 150ms ease, color 150ms ease",
  selectors: {
    "&:hover": { background: vars.color.surfaceSecondary, color: vars.color.textPrimary },
  },
});

export const copySuccessBtn = style({
  padding: `${vars.space["1"]} ${vars.space["3"]}`,
  border: `1px solid #16a34a`,
  borderRadius: vars.radius.md,
  background: "#dcfce7",
  color: "#15803d",
  fontSize: "12px",
  fontWeight: "500",
  cursor: "pointer",
  fontFamily: vars.font.family,
});

export const emptyText = style({
  textAlign: "center",
  color: vars.color.textSecondary,
  fontSize: "13px",
  padding: `${vars.space["6"]} 0`,
});
```

- [ ] **Step 2: TSX 파일 교체**

`apps/web/src/features/editor/components/ExportDdlModal.tsx` 전체 교체:

```typescript
import { useState } from "react";
import { Modal } from "../../../design-system";
import { generateDdl } from "../../../shared/utils/ddl-generator";
import { useEditorStore } from "../stores/useEditorStore";
import { copyToClipboard } from "../../../shared/utils/clipboard";
import { DarkCodeEditor } from "../../../shared/components/DarkCodeEditor";
import { body, toolbar, filenameLabel, toolbarBtns, actionBtn, copySuccessBtn, emptyText } from "./ExportDdlModal.css";

interface ExportDdlModalProps {
  open: boolean;
  diagramName: string;
  onClose: () => void;
}

export const ExportDdlModal = ({ open, diagramName, onClose }: ExportDdlModalProps) => {
  const document = useEditorStore((s) => s.document);
  const [copied, setCopied] = useState(false);

  const ddl = document ? generateDdl(document) : "";
  const filename = `${diagramName.replace(/[^a-zA-Z0-9_-]/g, "_")}.sql`;

  function handleCopy() {
    copyToClipboard(ddl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownload() {
    const blob = new Blob([ddl], { type: "text/sql" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Modal open={open} onClose={onClose} title="DDL 내보내기">
      <div className={body}>
        {ddl ? (
          <>
            <div className={toolbar}>
              <span className={filenameLabel}>{filename}</span>
              <div className={toolbarBtns}>
                <button
                  className={copied ? copySuccessBtn : actionBtn}
                  onClick={handleCopy}
                  type="button"
                >
                  {copied ? "✓ 복사됨" : "📋 복사"}
                </button>
                <button className={actionBtn} onClick={handleDownload} type="button">
                  ⬇ 다운로드
                </button>
              </div>
            </div>
            <DarkCodeEditor value={ddl} height="400px" />
          </>
        ) : (
          <div className={emptyText}>테이블이 없습니다. 먼저 ERD를 작성해 주세요.</div>
        )}
      </div>
    </Modal>
  );
};
```

- [ ] **Step 3: TypeScript 확인**

```bash
cd apps/web && pnpm tsc --noEmit 2>&1 | grep "ExportDdlModal"
```

Expected: 에러 없음

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/editor/components/ExportDdlModal.tsx \
        apps/web/src/features/editor/components/ExportDdlModal.css.ts
git commit -m "feat(web): redesign ExportDdlModal with dark code editor and filename label"
```

---

## Task 7: ExportOrmModal 리디자인

**Files:**
- Modify: `apps/web/src/features/editor/components/ExportOrmModal.tsx`
- Modify: `apps/web/src/features/editor/components/export-orm-modal.css.ts`

- [ ] **Step 1: CSS 파일 교체**

`apps/web/src/features/editor/components/export-orm-modal.css.ts` 전체 교체:

```typescript
import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const body = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space["3"],
});

export const tabRow = style({
  display: "flex",
  borderBottom: `1px solid ${vars.color.border}`,
  gap: 0,
});

export const tab = style({
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  fontSize: "13px",
  fontWeight: "500",
  cursor: "pointer",
  border: "none",
  background: "transparent",
  color: vars.color.textSecondary,
  fontFamily: vars.font.family,
  borderBottom: "2px solid transparent",
  marginBottom: "-1px",
  transition: "color 150ms ease, border-color 150ms ease",
  selectors: {
    "&:hover": { color: vars.color.textPrimary },
  },
});

export const tabActive = style({
  color: vars.color.primary,
  borderBottomColor: vars.color.primary,
  fontWeight: "600",
});

export const toolbar = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: vars.space["2"],
});

export const filenameLabel = style({
  fontSize: "12px",
  fontWeight: "600",
  color: vars.color.textSecondary,
  fontFamily: "var(--font-mono, 'Courier New', monospace)",
  background: vars.color.surfaceSecondary,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  padding: `2px ${vars.space["2"]}`,
});

export const toolbarBtns = style({
  display: "flex",
  gap: vars.space["2"],
});

export const actionBtn = style({
  padding: `${vars.space["1"]} ${vars.space["3"]}`,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  background: vars.color.surface,
  color: vars.color.textSecondary,
  fontSize: "12px",
  fontWeight: "500",
  cursor: "pointer",
  fontFamily: vars.font.family,
  transition: "background 150ms ease, color 150ms ease",
  selectors: {
    "&:hover": { background: vars.color.surfaceSecondary, color: vars.color.textPrimary },
  },
});

export const copySuccessBtn = style({
  padding: `${vars.space["1"]} ${vars.space["3"]}`,
  border: `1px solid #16a34a`,
  borderRadius: vars.radius.md,
  background: "#dcfce7",
  color: "#15803d",
  fontSize: "12px",
  fontWeight: "500",
  cursor: "pointer",
  fontFamily: vars.font.family,
});

export const emptyText = style({
  textAlign: "center",
  color: vars.color.textSecondary,
  fontSize: "13px",
  padding: `${vars.space["6"]} 0`,
});
```

- [ ] **Step 2: TSX 파일 교체**

`apps/web/src/features/editor/components/ExportOrmModal.tsx` 전체 교체:

```typescript
import { useState } from "react";
import { Modal } from "../../../design-system/Modal";
import { generateOrm } from "@erdify/domain";
import type { OrmType } from "@erdify/domain";
import { useEditorStore } from "../stores/useEditorStore";
import { copyToClipboard } from "../../../shared/utils/clipboard";
import { DarkCodeEditor } from "../../../shared/components/DarkCodeEditor";
import * as css from "./export-orm-modal.css";

interface ExportOrmModalProps {
  open: boolean;
  onClose: () => void;
}

const TABS: { label: string; value: OrmType; ext: string }[] = [
  { label: "TypeORM", value: "typeorm", ext: "ts" },
  { label: "Prisma", value: "prisma", ext: "prisma" },
  { label: "SQLAlchemy", value: "sqlalchemy", ext: "py" },
];

export const ExportOrmModal = ({ open, onClose }: ExportOrmModalProps) => {
  const [orm, setOrm] = useState<OrmType>("typeorm");
  const [copied, setCopied] = useState(false);
  const document = useEditorStore((s) => s.document);

  const code = document ? generateOrm(document, orm) : "";
  const currentTab = TABS.find((t) => t.value === orm)!;
  const filename = `schema.${currentTab.ext}`;

  function handleCopy() {
    copyToClipboard(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownload() {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Modal open={open} onClose={onClose} title="ORM 코드 내보내기" maxWidth="640px">
      <div className={css.body}>
        <div className={css.tabRow}>
          {TABS.map((t) => (
            <button
              key={t.value}
              className={`${css.tab}${orm === t.value ? ` ${css.tabActive}` : ""}`}
              onClick={() => { setOrm(t.value); setCopied(false); }}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </div>

        {code ? (
          <>
            <div className={css.toolbar}>
              <span className={css.filenameLabel}>{filename}</span>
              <div className={css.toolbarBtns}>
                <button className={copied ? css.copySuccessBtn : css.actionBtn} onClick={handleCopy} type="button">
                  {copied ? "✓ 복사됨" : "📋 복사"}
                </button>
                <button className={css.actionBtn} onClick={handleDownload} type="button">
                  ⬇ 다운로드 (.{currentTab.ext})
                </button>
              </div>
            </div>
            <DarkCodeEditor value={code} height="440px" />
          </>
        ) : (
          <div className={css.emptyText}>테이블이 없습니다</div>
        )}
      </div>
    </Modal>
  );
};
```

- [ ] **Step 3: TypeScript 확인**

```bash
cd apps/web && pnpm tsc --noEmit 2>&1 | grep "ExportOrmModal"
```

Expected: 에러 없음

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/editor/components/ExportOrmModal.tsx \
        apps/web/src/features/editor/components/export-orm-modal.css.ts
git commit -m "feat(web): redesign ExportOrmModal with dark code editor and filename label"
```

---

## Task 8: 통합 검증

- [ ] **Step 1: 전체 TypeScript 타입 검사**

```bash
cd /path/to/repo && pnpm --filter @erdify/web tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 2: 전체 테스트 통과**

```bash
pnpm --filter @erdify/domain test
```

Expected: 모든 테스트 PASS

- [ ] **Step 3: 개발 서버에서 수동 검증**

```bash
pnpm dev
```

검증 항목:
1. ImportDiagramModal 열기 → 탭 (MySQL/PostgreSQL/MariaDB/MSSQL/ExERD파일) 확인
2. MSSQL 탭 선택 → T-SQL 붙여넣기 → "ERD로 변환 →" → ERD 생성 확인
3. .sql 파일 드래그앤드롭 → 코드 에디터에 내용 채워짐 확인
4. ExportDdlModal → 파일명 라벨, 복사 버튼, 다크 코드 블록 확인
5. ExportOrmModal → TypeORM/Prisma/SQLAlchemy 탭, 파일명 라벨, 다크 코드 블록 확인

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat(web): complete modal redesign and MSSQL support"
```
