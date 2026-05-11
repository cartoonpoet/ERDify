import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import type { ChangeEvent } from "react";
import {
  addColumn,
  addIndex,
  removeColumn,
  removeEntity,
  removeIndex,
  renameEntity,
  setEntitySchema,
  setSeedData,
  updateColumn,
  updateEntityComment,
  updateIndex,
} from "@erdify/domain";
import type { SeedRow } from "@erdify/domain";
import { useEditorStore } from "@/store/useEditorStore";
import type { EditableTableNodeType } from "@/store/useEditorStore";
import { getSchemaColor, getSchemasFromDocument } from "@/utils/schema-colors";
import { DEFAULT_HEADER_COLOR, makeColumn, makeIndex } from "./constants";
import { TypeSelect } from "./TypeSelect";
import { SchemaStrip } from "./SchemaStrip";
import { IndexColumnSelect } from "./IndexColumnSelect";
import * as css from "./editable-table-node.css";

export const EditableTableNode = ({ data, selected }: NodeProps<EditableTableNodeType>) => {
  const { entity, collaboratorColor } = data;
  const applyCommand = useEditorStore((s) => s.applyCommand);
  const setSelectedEntity = useEditorStore((s) => s.setSelectedEntity);
  const canEdit = useEditorStore((s) => s.canEdit);
  const document = useEditorStore((s) => s.document);
  const schemaColors = useEditorStore((s) => s.schemaColors);

  const fkColumnIds = new Set(
    document?.relationships.flatMap((r) => [...r.sourceColumnIds, ...r.targetColumnIds]) ?? []
  );
  const entityIndexes = document?.indexes.filter((i) => i.entityId === entity.id) ?? [];

  const allSchemas = document ? getSchemasFromDocument(document.entities) : [];
  const schemaColor = entity.schema ? getSchemaColor(entity.schema, allSchemas, schemaColors) : null;

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
        {entity.schema && <SchemaStrip schema={entity.schema} allSchemas={allSchemas} schemaColors={schemaColors} />}
        <div
          style={{
            background: collaboratorColor ?? entity.color ?? schemaColor ?? DEFAULT_HEADER_COLOR,
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
      <SchemaStrip
        schema={entity.schema ?? null}
        allSchemas={allSchemas}
        schemaColors={schemaColors}
        onChange={(s) => applyCommand((doc) => setEntitySchema(doc, entity.id, s))}
      />

      {/* 헤더 */}
      <div className={css.headerEditRow} style={{ background: entity.color ?? schemaColor ?? DEFAULT_HEADER_COLOR, borderRadius: 0 }}>
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
          ✕
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

      {/* 시드 데이터 섹션 */}
      {(() => {
        const sortedCols = [...entity.columns].sort((a, b) => a.ordinal - b.ordinal);
        const seedRows = entity.seedData ?? [];

        const updateRow = (rowIdx: number, colId: string, value: string) => {
          const next = seedRows.map((r, i) => i === rowIdx ? { ...r, [colId]: value } : r);
          applyCommand((doc) => setSeedData(doc, entity.id, next));
        };

        const addRow = () => {
          applyCommand((doc) => setSeedData(doc, entity.id, [...seedRows, {} as SeedRow]));
        };

        const removeRow = (rowIdx: number) => {
          applyCommand((doc) => setSeedData(doc, entity.id, seedRows.filter((_, i) => i !== rowIdx)));
        };

        return (
          <div className={css.indexSection}>
            <div className={css.indexSectionHeader}>
              <span className={css.indexSectionLabel}>Seed Data</span>
              <button type="button" className={`${css.indexAddBtn} nodrag`} onClick={addRow} aria-label="시드 데이터 행 추가">
                + 추가
              </button>
            </div>

            {sortedCols.length > 0 && seedRows.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                {/* 컬럼 헤더 */}
                <div style={{ display: "flex", gap: 3, marginBottom: 3, paddingLeft: 2 }}>
                  {sortedCols.map((col) => (
                    <div key={col.id} style={{ width: 72, flexShrink: 0, fontSize: 8, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {col.name}
                    </div>
                  ))}
                  <div style={{ width: 18 }} />
                </div>
                {/* 데이터 행 */}
                {seedRows.map((row, rowIdx) => (
                  <div key={rowIdx} style={{ display: "flex", gap: 3, marginBottom: 3, alignItems: "center" }}>
                    {sortedCols.map((col) => (
                      <input
                        key={col.id}
                        className="nodrag"
                        style={{ width: 72, flexShrink: 0, fontSize: 10, padding: "2px 4px", border: "1px solid #e5e7eb", borderRadius: 3, fontFamily: "monospace", background: "#fff", color: "#111827" }}
                        value={row[col.id] ?? ""}
                        placeholder="NULL"
                        aria-label={`${entity.name}.${col.name} 시드값`}
                        onChange={(e) => updateRow(rowIdx, col.id, e.target.value)}
                      />
                    ))}
                    <button
                      type="button"
                      className={`${css.indexDeleteBtn} nodrag`}
                      onClick={() => removeRow(rowIdx)}
                      aria-label={`${rowIdx + 1}번 행 삭제`}
                      title="행 삭제"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {seedRows.length === 0 && (
              <div style={{ fontSize: 9, color: "#c4c9d4", fontStyle: "italic", paddingLeft: 2 }}>
                시드 데이터 없음
              </div>
            )}
          </div>
        );
      })()}

      <Handle type="source" position={Position.Right} />
    </div>
  );
};
