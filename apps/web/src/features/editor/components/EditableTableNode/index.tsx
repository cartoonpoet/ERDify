import { useState, useRef, memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { IMEInput } from "./IMEInput";
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
import type { DiagramIndex } from "@erdify/domain";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import type { EditableTableNodeType } from "@/features/editor/store/useEditorStore";
import { getSchemaColor } from "@/shared/utils/schema-colors";
import { DEFAULT_HEADER_COLOR, makeColumn, makeIndex } from "./constants";
import { TypeSelect } from "./TypeSelect";
import { SchemaStrip } from "./SchemaStrip";
import { IndexColumnSelect } from "./IndexColumnSelect";
import { SeedLens } from "./SeedLens";
import * as css from "./editable-table-node.css";
import { suggestColumns } from "@/features/ai/api/ai.api";
import type { ColumnSuggestion } from "@erdify/contracts";

const EMPTY_INDEXES: DiagramIndex[] = [];

const EditableTableNodeInner = ({ data, selected }: NodeProps<EditableTableNodeType>) => {
  const { entity, collaboratorColor } = data;
  const applyCommand = useEditorStore((s) => s.applyCommand);
  const setSelectedEntity = useEditorStore((s) => s.setSelectedEntity);
  const canEdit = useEditorStore((s) => s.canEdit);
  const schemaColors = useEditorStore((s) => s.schemaColors);
  const fkColumnIds = useEditorStore((s) => s.fkColumnIds);
  const entityIndexes = useEditorStore((s) => s.indexesByEntityId.get(entity.id) ?? EMPTY_INDEXES);
  const allSchemas = useEditorStore((s) => s.allSchemas);

  const [suggestions, setSuggestions] = useState<ColumnSuggestion[]>([]);
  const [activeSuggestionColId, setActiveSuggestionColId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleColumnNameInput = (columnId: string, value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) {
      setSuggestions([]);
      return;
    }
    setActiveSuggestionColId(columnId);
    debounceRef.current = setTimeout(() => {
      const existingColumnNames = entity.columns.map((c) => c.name);
      suggestColumns(entity.name, existingColumnNames)
        .then((results) => {
          setSuggestions(results.filter((r) => r.name.toLowerCase().startsWith(value.toLowerCase())));
        })
        .catch(() => setSuggestions([]));
    }, 300);
  };

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
        className={`${css.tableNodeWrapper} ${css.tableNodeWrapperReadOnly}`}
        style={{
          border: `2px solid ${borderColor}`,
          ...(schemaColor ? { borderLeft: `5px solid ${schemaColor}` } : {}),
          boxShadow,
        }}
      >
        <Handle type="target" position={Position.Left} />
        {collaboratorColor && (
          <div className={css.collaboratorDot} style={{ background: collaboratorColor }} />
        )}
        {entity.schema && <SchemaStrip schema={entity.schema} allSchemas={allSchemas} schemaColors={schemaColors} />}
        <div
          className={css.tableNodeHeader}
          style={{
            background: collaboratorColor ?? entity.color ?? schemaColor ?? DEFAULT_HEADER_COLOR,
            borderRadius: entity.schema ? 0 : "4px 4px 0 0",
          }}
        >
          {entity.name}
          {entity.comment && (
            <div className={css.tableNodeHeaderComment}>
              {entity.comment}
            </div>
          )}
        </div>
        {/* 컬럼 헤더 */}
        <div className={css.roColHeaderRow}>
          <span className={css.roColHeaderCellFixed}>PK</span>
          <span className={css.roColHeaderCellFk}>FK</span>
          <span className={css.roColHeaderCellNullable}>?</span>
          <span className={css.roColHeaderCellFixed}>UQ</span>
          <span className={css.roColHeaderCellFluid}>논리명</span>
          <span className={css.roColHeaderCellWide}>컬럼명</span>
          <span className={css.roColHeaderCellType}>타입</span>
        </div>
        <ul className={css.roColList}>
          {entity.columns.map((col) => (
            <li key={col.id} className={css.roColRow}>
              <div className={css.roBadgeCell}>
                {col.primaryKey && <span className={css.roPkBadge}>PK</span>}
              </div>
              <div className={css.roFkCell}>
                {fkColumnIds.has(col.id) && (
                  <span className={css.fkDot} aria-label="FK" title="Foreign Key" />
                )}
              </div>
              <div className={css.roNullableCell}>
                {col.nullable && <span className={css.roNullableText}>?</span>}
              </div>
              <div className={css.roBadgeCell}>
                {col.unique && !col.primaryKey && <span className={css.roUqBadge}>UQ</span>}
              </div>
              <div className={css.roLogicalNameCell}>{col.comment ?? ""}</div>
              <div className={css.roColumnNameCell}>{col.name}</div>
              <div className={css.roTypeCell}>{col.type}</div>
            </li>
          ))}
          {entity.columns.length === 0 && (
            <li className={css.roEmptyColumns}>컬럼 없음</li>
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
                <div key={idx.id} className={css.roIndexRow}>
                  <span className={css.roIndexBadgeVariants[idx.unique ? "unique" : "normal"]}>
                    {idx.unique ? "UQ" : "IDX"}
                  </span>
                  <span className={css.roIndexName}>{idx.name}</span>
                  {colNames && <span className={css.roIndexColNames}>({colNames})</span>}
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
      className={`${css.tableNodeWrapper} ${css.tableNodeWrapperEdit}`}
      style={{
        border: `2px solid ${borderColor}`,
        ...(schemaColor ? { borderLeft: `5px solid ${schemaColor}` } : {}),
        boxShadow,
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
      <div className={css.headerEditRow} style={{ background: entity.color ?? schemaColor ?? DEFAULT_HEADER_COLOR }}>
        <IMEInput
          className={`${css.tableCommentInput} nodrag nokey`}
          value={entity.comment ?? ""}
          placeholder="논리명 (선택)"
          aria-label="테이블 논리명"
          onChange={(v) => applyCommand((doc) => updateEntityComment(doc, entity.id, v || null))}
        />
        <IMEInput
          className={`${css.tableNameInput} nodrag nokey`}
          value={entity.name}
          aria-label="테이블명"
          onChange={(v) => applyCommand((doc) => renameEntity(doc, entity.id, v))}
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
        <span className={css.colHeaderCellFixed}>PK</span>
        <span className={css.colHeaderCellFixed}>FK</span>
        <span className={css.colHeaderCellFixed}>NULL</span>
        <span className={css.colHeaderCellFixed}>UQ</span>
        <span className={css.colHeaderCellFluid}>논리명</span>
        <span className={css.colHeaderCellFluid}>컬럼명</span>
        <span className={css.colHeaderCellType}>타입</span>
        <span className={css.colHeaderSpacer} />
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
          <IMEInput
            className={`${css.logicalNameInput} nodrag nokey`}
            value={col.comment ?? ""}
            placeholder="논리명..."
            aria-label={`${col.name} 논리명`}
            onChange={(v) => applyCommand((doc) => updateColumn(doc, entity.id, col.id, { comment: v || null }))}
          />
          {/* 컬럼명 */}
          <div
            className={css.colNameWrapper}
            onInput={(e) => {
              const target = e.target as HTMLInputElement;
              handleColumnNameInput(col.id, target.value);
            }}
            onBlur={() => {
              setTimeout(() => {
                setSuggestions([]);
                setActiveSuggestionColId(null);
              }, 150);
            }}
          >
            <IMEInput
              className={`${css.columnNameInput} nodrag nokey`}
              value={col.name}
              aria-label="컬럼명"
              onChange={(v) => applyCommand((doc) => updateColumn(doc, entity.id, col.id, { name: v }))}
            />
            {activeSuggestionColId === col.id && suggestions.length > 0 && (
              <ul className={css.suggestionsList}>
                {suggestions.map((s) => (
                  <li
                    key={s.name}
                    className={css.suggestionItem}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyCommand((doc) => updateColumn(doc, entity.id, col.id, { name: s.name, type: s.type, nullable: s.nullable, primaryKey: s.pk }));
                      setSuggestions([]);
                      setActiveSuggestionColId(null);
                    }}
                  >
                    <strong>{s.name}</strong>
                    <span className={css.suggestionItemType}>{s.type}</span>
                    {s.pk && <span className={css.suggestionItemPk}>PK</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
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
            <IMEInput
              className={`${css.indexNameInput} nodrag nokey`}
              value={idx.name}
              placeholder="인덱스명..."
              aria-label="인덱스명"
              onChange={(v) => applyCommand((doc) => updateIndex(doc, idx.id, { name: v }))}
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
          <div className={css.emptyIndexText}>
            인덱스 없음
          </div>
        )}
      </div>

      {/* 시드 데이터 섹션 */}
      <div className={css.indexSection}>
        <div className={css.indexSectionHeader}>
          <span className={css.indexSectionLabel}>
            Seed Data
          </span>
          <SeedLens
            entity={entity}
            onCommit={(rows) =>
              applyCommand((doc) => setSeedData(doc, entity.id, rows))
            }
          />
        </div>
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
};

export const EditableTableNode = memo(EditableTableNodeInner);
