import { randomUUID } from "../../../shared/utils/uuid";
import { useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import {
  addColumn,
  addIndex,
  removeColumn,
  removeEntity,
  removeIndex,
  renameEntity,
  setEntitySchema,
  updateColumn,
  updateEntityColor,
  updateEntityComment,
  updateIndex,
} from "@erdify/domain";
import type { DiagramColumn, DiagramIndex } from "@erdify/domain";
import { useEditorStore } from "../stores/useEditorStore";
import type { EditableTableNodeType } from "../stores/useEditorStore";
import { getSchemaColor, getSchemasFromDocument } from "../../../shared/utils/schema-colors";
import * as css from "./editable-table-node.css";

const DEFAULT_HEADER_COLOR = "#0064E0";

const PRESET_COLORS = [
  "#374151",
  "#0064E0",
  "#7c3aed",
  "#059669",
  "#dc2626",
  "#d97706",
  "#db2777",
  "#0891b2",
];

const COLUMN_TYPES = [
  "varchar(255)", "text", "int", "bigint", "boolean",
  "timestamp", "uuid", "decimal(10,2)", "json", "jsonb",
];

const makeColumn = (ordinal: number): DiagramColumn => ({
  id: randomUUID(),
  name: "column",
  type: "varchar(255)",
  nullable: true,
  primaryKey: false,
  unique: false,
  defaultValue: null,
  comment: null,
  ordinal,
});

const makeIndex = (entityId: string, entityName: string): DiagramIndex => {
  const safeName = entityName.replace(/\s+/g, "_").toLowerCase();
  return {
    id: randomUUID(),
    entityId,
    name: `idx_${safeName}`,
    columnIds: [],
    unique: false,
  };
};

const TypeSelect = ({ value, onChange, label }: { value: string; onChange: (val: string) => void; label?: string }) => {
  const [inputVal, setInputVal] = useState(value);
  const [open, setOpen] = useState(false);

  const filtered = COLUMN_TYPES.filter((t) =>
    t.toLowerCase().includes(inputVal.toLowerCase())
  );

  const commit = (val: string) => {
    const trimmed = val.trim();
    if (trimmed) onChange(trimmed);
    else setInputVal(value);
    setOpen(false);
  };

  return (
    <div className={css.typeSelectWrapper}>
      <input
        className={`${css.typeInput} nodrag`}
        value={inputVal}
        onChange={(e) => { setInputVal(e.target.value); setOpen(true); }}
        onFocus={() => { setInputVal(value); setOpen(true); }}
        onBlur={() => commit(inputVal)}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === "Enter") { e.preventDefault(); commit(inputVal); }
          if (e.key === "Escape") { setInputVal(value); setOpen(false); }
        }}
        placeholder="타입..."
        spellCheck={false}
        aria-label={label ?? "컬럼 타입"}
      />
      {open && filtered.length > 0 && (
        <div className={`${css.typeDropdown} nodrag nopan`}>
          {filtered.map((t) => (
            <button
              key={t}
              type="button"
              className={`${css.typeOption}${t === value ? ` ${css.typeOptionActive}` : ""}`}
              onMouseDown={(e) => { e.preventDefault(); onChange(t); setInputVal(t); setOpen(false); }}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const SchemaSelector = ({
  schema,
  allSchemas,
  onChange,
}: {
  schema: string | null | undefined;
  allSchemas: string[];
  onChange: (s: string | null) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const color = schema ? getSchemaColor(schema, allSchemas) : "#CBD2D9";

  const filtered = inputVal.trim()
    ? allSchemas.filter((s) => s.toLowerCase().includes(inputVal.toLowerCase()))
    : allSchemas;

  const handleSelect = (s: string) => { onChange(s); setOpen(false); setInputVal(""); };
  const handleClose = () => { setOpen(false); setInputVal(""); };

  const commitInput = () => {
    const trimmed = inputVal.trim();
    if (trimmed) handleSelect(trimmed);
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        className="nodrag"
        onClick={() => setOpen((o) => !o)}
        title="스키마 변경"
        style={{
          display: "flex", alignItems: "center", gap: 4,
          background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)",
          borderRadius: 5, padding: "2px 6px", cursor: "pointer",
          fontSize: 10, color: "#fff", fontWeight: 500,
        }}
      >
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
        {schema ?? "스키마"} ▾
      </button>
      {open && (
        <>
          <div className="nodrag nopan" onClick={handleClose} style={{ position: "fixed", inset: 0, zIndex: 999 }} />
          <div
            className="nodrag nopan"
            style={{
              position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 1000,
              background: "#fff", border: "1px solid #DEE3E9", borderRadius: 8,
              boxShadow: "0 4px 12px rgba(0,0,0,.1)", minWidth: 160, overflow: "hidden",
            }}
          >
            {/* 새 스키마 입력 */}
            <div style={{ padding: "6px 8px", borderBottom: "1px solid #F1F4F7" }}>
              <input
                autoFocus
                className="nodrag"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); commitInput(); }
                  if (e.key === "Escape") handleClose();
                }}
                placeholder="스키마 입력 또는 선택..."
                style={{
                  width: "100%", padding: "4px 8px", fontSize: 11,
                  border: "1px solid #DEE3E9", borderRadius: 5,
                  outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
            {/* 기존 스키마 목록 */}
            {filtered.map((s) => (
              <button
                key={s}
                type="button"
                className="nodrag"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  width: "100%", padding: "6px 10px", background: s === schema ? "#EEF4FF" : "none",
                  border: "none", textAlign: "left", cursor: "pointer",
                  fontSize: 11, color: s === schema ? "#0064E0" : "#374151",
                  fontWeight: s === schema ? 500 : 400,
                }}
              >
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: getSchemaColor(s, allSchemas), flexShrink: 0 }} />
                {s}
              </button>
            ))}
            {/* 새 항목 추가 제안 */}
            {inputVal.trim() && !allSchemas.includes(inputVal.trim()) && (
              <button
                type="button"
                className="nodrag"
                onMouseDown={(e) => { e.preventDefault(); commitInput(); }}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  width: "100%", padding: "6px 10px", background: "none",
                  border: "none", textAlign: "left", cursor: "pointer",
                  fontSize: 11, color: "#0064E0",
                }}
              >
                + "{inputVal.trim()}" 스키마 생성
              </button>
            )}
            {/* 스키마 해제 */}
            {schema && (
              <>
                <div style={{ height: 1, background: "#F1F4F7" }} />
                <button
                  type="button"
                  className="nodrag"
                  onMouseDown={(e) => { e.preventDefault(); onChange(null); handleClose(); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    width: "100%", padding: "6px 10px", background: "none",
                    border: "none", textAlign: "left", cursor: "pointer",
                    fontSize: 11, color: "#9CA3AF",
                  }}
                >
                  없음 (해제)
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const ColorPicker = ({ value, onChange }: { value: string | null; onChange: (c: string | null) => void }) => {
  const [open, setOpen] = useState(false);
  const current = value ?? DEFAULT_HEADER_COLOR;

  return (
    <div className={css.colorPickerWrapper}>
      <button
        type="button"
        className={`${css.colorSwatch} nodrag`}
        style={{ background: current }}
        onClick={() => setOpen((o) => !o)}
        aria-label="헤더 색상 변경"
        aria-expanded={open}
        aria-haspopup="listbox"
      />
      {open && (
        <div className={`${css.colorDropdown} nodrag nopan`}>
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={css.colorOption}
              style={{ background: c, outline: c === current ? "2px solid #fff" : "none" }}
              onMouseDown={(e) => { e.preventDefault(); onChange(c); setOpen(false); }}
              title={c}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const SchemaStrip = ({ schema, allSchemas }: { schema: string; allSchemas: string[] }) => {
  const color = getSchemaColor(schema, allSchemas);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 5,
      padding: "3px 10px 3px 12px",
      fontSize: 9, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase",
      borderBottom: `1px solid ${color}30`,
      background: `${color}10`,
      color,
      flexShrink: 0,
    }}>
      <div style={{ width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0 }} />
      {schema}
    </div>
  );
};

const IndexColumnSelect = ({
  entityColumns,
  selectedIds,
  onChange,
}: {
  entityColumns: DiagramColumn[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) => {
  const [open, setOpen] = useState(false);
  const label = selectedIds.length === 0
    ? "컬럼 선택"
    : selectedIds
        .map((id) => entityColumns.find((c) => c.id === id)?.name ?? id)
        .join(", ");

  const toggle = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    onChange(next);
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        className={`${css.indexColsBtn} nodrag`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`컬럼 선택: ${label}`}
      >
        {label}
      </button>
      {open && (
        <>
          <div
            className={`${css.indexColsBackdrop} nodrag nopan`}
            onClick={() => setOpen(false)}
          />
          <div className={`${css.indexColsDropdown} nodrag nopan`}>
            {entityColumns.map((col) => (
              <label key={col.id} className={css.indexColOption}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(col.id)}
                  onChange={() => toggle(col.id)}
                  style={{ width: 12, height: 12, accentColor: "#6366f1" }}
                />
                {col.name}
              </label>
            ))}
            {entityColumns.length === 0 && (
              <div style={{ padding: "6px 10px", fontSize: 10, color: "#9ca3af" }}>컬럼 없음</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export const EditableTableNode = ({ data, selected }: NodeProps<EditableTableNodeType>) => {
  const { entity, collaboratorColor } = data;
  const applyCommand = useEditorStore((s) => s.applyCommand);
  const setSelectedEntity = useEditorStore((s) => s.setSelectedEntity);
  const canEdit = useEditorStore((s) => s.canEdit);
  const document = useEditorStore((s) => s.document);

  const fkColumnIds = new Set(
    document?.relationships.flatMap((r) => [...r.sourceColumnIds, ...r.targetColumnIds]) ?? []
  );
  const entityIndexes = document?.indexes.filter((i) => i.entityId === entity.id) ?? [];

  const allSchemas = document ? getSchemasFromDocument(document.entities) : [];
  const schemaColor = entity.schema ? getSchemaColor(entity.schema, allSchemas) : null;

  const borderColor = collaboratorColor ?? (selected ? "var(--color-primary, #0064E0)" : "#d1d5db");
  const boxShadow = collaboratorColor
    ? `0 0 0 3px ${collaboratorColor}40`
    : selected
    ? "0 4px 20px rgba(0, 100, 224, 0.18)"
    : "0 1px 4px rgba(0,0,0,0.1)";

  // ─── 읽기 전용 모드 ───
  if (!canEdit) {
    return (
      <div
        style={{
          background: "#ffffff",
          border: `2px solid ${borderColor}`,
          ...(schemaColor ? { borderLeft: `5px solid ${schemaColor}` } : {}),
          borderRadius: 6,
          minWidth: 380,
          fontFamily: "monospace",
          fontSize: 12,
          boxShadow,
          position: "relative",
        }}
      >
        <Handle type="target" position={Position.Left} />
        {collaboratorColor && (
          <div className={css.collaboratorDot} style={{ background: collaboratorColor }} />
        )}
        {entity.schema && <SchemaStrip schema={entity.schema} allSchemas={allSchemas} />}
        <div
          style={{
            background: collaboratorColor ?? entity.color ?? DEFAULT_HEADER_COLOR,
            color: "#ffffff",
            padding: "6px 10px",
            fontWeight: 700,
            borderRadius: entity.schema ? 0 : "4px 4px 0 0",
            fontSize: 13,
          }}
        >
          {entity.name}
          {entity.comment && (
            <div style={{ fontSize: 10, fontStyle: "italic", fontWeight: 400, color: "rgba(255,255,255,0.75)", marginTop: 1 }}>
              {entity.comment}
            </div>
          )}
        </div>
        {/* 컬럼 헤더 */}
        <div style={{
          display: "flex", alignItems: "center",
          padding: "3px 8px 3px 10px",
          background: "#F8FAFB", borderBottom: "1px solid #E5E7EB",
          fontSize: 9, color: "#9ca3af", fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase",
        }}>
          <span style={{ width: 24, flexShrink: 0, textAlign: "center" }}>PK</span>
          <span style={{ width: 20, flexShrink: 0, textAlign: "center" }}>FK</span>
          <span style={{ width: 28, flexShrink: 0, textAlign: "center" }}>?</span>
          <span style={{ width: 24, flexShrink: 0, textAlign: "center" }}>UQ</span>
          <span style={{ flex: 1 }}>논리명</span>
          <span style={{ flex: 1.2 }}>컬럼명</span>
          <span style={{ width: 90, flexShrink: 0 }}>타입</span>
        </div>
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {entity.columns.map((col) => (
            <li key={col.id} style={{ display: "flex", alignItems: "center", padding: "4px 8px 4px 10px", borderBottom: "1px solid #F1F4F7" }}>
              <div style={{ width: 24, flexShrink: 0, textAlign: "center" }}>
                {col.primaryKey && <span style={{ color: "#f59e0b", fontWeight: 700, fontSize: 8 }}>PK</span>}
              </div>
              <div style={{ width: 20, flexShrink: 0, display: "flex", justifyContent: "center" }}>
                {fkColumnIds.has(col.id) && (
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3b82f6", display: "inline-block", flexShrink: 0 }} aria-label="FK" title="Foreign Key" />
                )}
              </div>
              <div style={{ width: 28, flexShrink: 0, textAlign: "center" }}>
                {col.nullable && <span style={{ color: "#9ca3af", fontSize: 10 }}>?</span>}
              </div>
              <div style={{ width: 24, flexShrink: 0, textAlign: "center" }}>
                {col.unique && !col.primaryKey && <span style={{ color: "#6366f1", fontSize: 8, fontWeight: 700 }}>UQ</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 9, color: "#8b5cf6" }}>
                {col.comment ?? ""}
              </div>
              <div style={{ flex: 1.2, minWidth: 0, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {col.name}
              </div>
              <div style={{ width: 90, flexShrink: 0, color: "#6b7280", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {col.type}
              </div>
            </li>
          ))}
          {entity.columns.length === 0 && (
            <li style={{ padding: "4px 10px", color: "#9ca3af", fontStyle: "italic" }}>컬럼 없음</li>
          )}
        </ul>
        {entityIndexes.length > 0 && (
          <div className={css.indexSection}>
            <div className={css.indexSectionLabel}>Indexes</div>
            {entityIndexes.map((idx) => {
              const colNames = idx.columnIds
                .map((id) => entity.columns.find((c) => c.id === id)?.name ?? id)
                .join(", ");
              return (
                <div key={idx.id} style={{ display: "flex", gap: 5, alignItems: "center", padding: "2px 0", fontSize: 10 }}>
                  <span style={{
                    fontSize: 8, fontWeight: 700, flexShrink: 0,
                    color: idx.unique ? "#6366f1" : "#6b7280",
                    background: idx.unique ? "#eef2ff" : "#f3f4f6",
                    borderRadius: 3, padding: "1px 4px",
                  }}>
                    {idx.unique ? "UQ" : "IDX"}
                  </span>
                  <span style={{ color: "#374151" }}>{idx.name}</span>
                  {colNames && <span style={{ color: "#9ca3af", fontSize: 9 }}>({colNames})</span>}
                </div>
              );
            })}
          </div>
        )}
        <Handle type="source" position={Position.Right} />
      </div>
    );
  }

  // ─── 편집 모드 ───
  return (
    <div
      style={{
        background: "#ffffff",
        border: `2px solid ${borderColor}`,
        ...(schemaColor ? { borderLeft: `5px solid ${schemaColor}` } : {}),
        borderRadius: 6,
        minWidth: 420,
        fontFamily: "monospace",
        fontSize: 12,
        boxShadow,
        position: "relative",
      }}
    >
      <Handle type="target" position={Position.Left} />
      {entity.schema && <SchemaStrip schema={entity.schema} allSchemas={allSchemas} />}

      {/* 헤더 */}
      <div className={css.headerEditRow} style={{ background: entity.color ?? DEFAULT_HEADER_COLOR }}>
        <ColorPicker
          value={entity.color ?? null}
          onChange={(color) => applyCommand((doc) => updateEntityColor(doc, entity.id, color))}
        />
        <input
          className={`${css.tableCommentInput} nodrag`}
          value={entity.comment ?? ""}
          placeholder="논리명 (선택)"
          aria-label="테이블 논리명"
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            applyCommand((doc) => updateEntityComment(doc, entity.id, e.target.value || null))
          }
        />
        <input
          className={`${css.tableNameInput} nodrag`}
          value={entity.name}
          aria-label="테이블명"
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            applyCommand((doc) => renameEntity(doc, entity.id, e.target.value))
          }
        />
        <SchemaSelector
          schema={entity.schema}
          allSchemas={allSchemas}
          onChange={(s) => applyCommand((doc) => setEntitySchema(doc, entity.id, s))}
        />
        <button
          type="button"
          className={`${css.deleteEntityBtn} nodrag`}
          onClick={() => {
            applyCommand((doc) => removeEntity(doc, entity.id));
            setSelectedEntity(null);
          }}
          aria-label={`${entity.name} 테이블 삭제`}
          title="테이블 삭제"
        >
          삭제
        </button>
      </div>

      {/* 컬럼 헤더 레이블 행 */}
      <div className={css.colHeaderRow}>
        <span style={{ width: 26 }} className={css.colHeaderLabel}>PK</span>
        <span style={{ width: 26 }} className={css.colHeaderLabel}>FK</span>
        <span style={{ width: 26 }} className={css.colHeaderLabel}>NULL</span>
        <span style={{ width: 26 }} className={css.colHeaderLabel}>UQ</span>
        <span style={{ flex: 1 }} className={css.colHeaderLabel}>논리명</span>
        <span style={{ flex: 1 }} className={css.colHeaderLabel}>컬럼명</span>
        <span style={{ width: 88 }} className={css.colHeaderLabel}>타입</span>
        <span style={{ width: 18 }} />
      </div>

      {/* 컬럼 행 */}
      {entity.columns.map((col) => (
        <div key={col.id} className={css.editColumnItem}>
          {/* PK */}
          <div className={css.checkboxCell}>
            <input
              type="checkbox"
              className={`${css.rowCheckbox} nodrag`}
              checked={col.primaryKey}
              aria-label={`${col.name} PK`}
              onChange={(e) =>
                applyCommand((doc) => updateColumn(doc, entity.id, col.id, { primaryKey: e.target.checked }))
              }
            />
          </div>
          {/* FK (read-only) */}
          <div className={css.fkDotCell}>
            {fkColumnIds.has(col.id) && <span className={css.fkDot} aria-label="FK" title="Foreign Key" />}
          </div>
          {/* NULL */}
          <div className={css.checkboxCell}>
            <input
              type="checkbox"
              className={`${css.rowCheckbox} nodrag`}
              checked={col.nullable}
              aria-label={`${col.name} NULL 허용`}
              onChange={(e) =>
                applyCommand((doc) => updateColumn(doc, entity.id, col.id, { nullable: e.target.checked }))
              }
            />
          </div>
          {/* UQ */}
          <div className={css.checkboxCell}>
            <input
              type="checkbox"
              className={`${css.rowCheckbox} nodrag`}
              checked={col.unique}
              aria-label={`${col.name} UNIQUE`}
              onChange={(e) =>
                applyCommand((doc) => updateColumn(doc, entity.id, col.id, { unique: e.target.checked }))
              }
            />
          </div>
          {/* 논리명 */}
          <input
            className={`${css.logicalNameInput} nodrag`}
            value={col.comment ?? ""}
            placeholder="논리명..."
            aria-label={`${col.name} 논리명`}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              applyCommand((doc) => updateColumn(doc, entity.id, col.id, { comment: e.target.value || null }))
            }
          />
          {/* 컬럼명 */}
          <input
            className={`${css.columnNameInput} nodrag`}
            value={col.name}
            aria-label="컬럼명"
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              applyCommand((doc) => updateColumn(doc, entity.id, col.id, { name: e.target.value }))
            }
          />
          {/* 타입 */}
          <TypeSelect
            value={col.type}
            onChange={(val) =>
              applyCommand((doc) => updateColumn(doc, entity.id, col.id, { type: val }))
            }
            label={`${col.name} 타입`}
          />
          {/* 삭제 */}
          <button
            type="button"
            className={`${css.deleteColBtn} nodrag`}
            onClick={() => applyCommand((doc) => removeColumn(doc, entity.id, col.id))}
            aria-label={`${col.name} 컬럼 삭제`}
            title="컬럼 삭제"
          >
            ×
          </button>
        </div>
      ))}

      {/* 컬럼 추가 버튼 */}
      <div className={css.addColumnWrapper}>
        <button
          type="button"
          className={`${css.addColumnBtn} nodrag`}
          onClick={() =>
            applyCommand((doc) => addColumn(doc, entity.id, makeColumn(entity.columns.length)))
          }
          aria-label={`${entity.name} 테이블에 컬럼 추가`}
        >
          + 컬럼 추가
        </button>
      </div>

      {/* 인덱스 섹션 */}
      <div className={css.indexSection}>
        <div className={css.indexSectionHeader}>
          <span className={css.indexSectionLabel}>Indexes</span>
          <button
            type="button"
            className={`${css.indexAddBtn} nodrag`}
            onClick={() =>
              applyCommand((doc) => addIndex(doc, makeIndex(entity.id, entity.name)))
            }
            aria-label="인덱스 추가"
          >
            + 추가
          </button>
        </div>

        {entityIndexes.map((idx) => (
          <div key={idx.id} className={css.indexRow}>
            <input
              className={`${css.indexNameInput} nodrag`}
              value={idx.name}
              placeholder="인덱스명..."
              aria-label="인덱스명"
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                applyCommand((doc) => updateIndex(doc, idx.id, { name: e.target.value }))
              }
            />
            <IndexColumnSelect
              entityColumns={entity.columns}
              selectedIds={idx.columnIds}
              onChange={(ids) => applyCommand((doc) => updateIndex(doc, idx.id, { columnIds: ids }))}
            />
            <button
              type="button"
              className={`${css.indexUniqueToggle}${idx.unique ? ` ${css.indexUniqueActive}` : ""} nodrag`}
              onClick={() => applyCommand((doc) => updateIndex(doc, idx.id, { unique: !idx.unique }))}
              aria-pressed={idx.unique}
              aria-label={idx.unique ? "UNIQUE 인덱스 (클릭하면 일반 인덱스로 변경)" : "일반 인덱스 (클릭하면 UNIQUE로 변경)"}
            >
              {idx.unique ? "UNIQUE" : "INDEX"}
            </button>
            <button
              type="button"
              className={`${css.indexDeleteBtn} nodrag`}
              onClick={() => applyCommand((doc) => removeIndex(doc, idx.id))}
              aria-label={`${idx.name || "인덱스"} 삭제`}
              title="인덱스 삭제"
            >
              ×
            </button>
          </div>
        ))}

        {entityIndexes.length === 0 && (
          <div style={{ fontSize: 9, color: "#c4c9d4", fontStyle: "italic", paddingLeft: 2 }}>
            인덱스 없음
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
};
