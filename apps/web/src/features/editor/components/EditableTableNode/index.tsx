import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { IMEInput } from "./IMEInput";
import {
  addColumn,
  removeEntity,
  renameEntity,
  setEntitySchema,
  setSeedData,
  updateColumn,
  updateEntityComment,
} from "@erdify/domain";
import type { DiagramIndex } from "@erdify/domain";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import type { EditableTableNodeType } from "@/features/editor/store/useEditorStore";
import { getSchemaColor } from "@/shared/utils/schema-colors";
import { DEFAULT_HEADER_COLOR, makeColumn } from "./constants";
import { SchemaStrip } from "./SchemaStrip";
import { SeedLens } from "./SeedLens";
import { ColumnRow } from "./ColumnRow";
import { IndexSection } from "./IndexSection";
import { useColumnNameSuggestions } from "@/features/editor/hooks/useColumnNameSuggestions";
import * as css from "./editable-table-node.css";

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
  const isFlashing = useEditorStore((s) => s.flashingEntityId === entity.id);
  const setFlashingEntityId = useEditorStore((s) => s.setFlashingEntityId);

  const { suggestions, activeSuggestionColId, handleColumnNameInput, clearSuggestions } =
    useColumnNameSuggestions(entity.name, entity.columns);

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
        className={`${css.tableNodeWrapper} ${css.tableNodeWrapperReadOnly}${isFlashing ? ` ${css.tableNodeGlow}` : ""}`}
        style={{
          border: `2px solid ${borderColor}`,
          ...(schemaColor ? { borderLeft: `5px solid ${schemaColor}` } : {}),
          boxShadow,
        }}
        onAnimationEnd={() => setFlashingEntityId(null)}
      >
        <Handle type="target" position={Position.Left} />
        {collaboratorColor && (
          <div className={css.collaboratorDot} style={{ background: collaboratorColor }} />
        )}
        {entity.schema && <SchemaStrip schema={entity.schema} />}
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
          <span className={css.roColHeaderCellFixed} title="AUTO_INCREMENT">AI</span>
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
              <div className={css.roBadgeCell}>
                {col.autoIncrement && <span className={css.roAiBadge}>AI</span>}
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
      className={`${css.tableNodeWrapper} ${css.tableNodeWrapperEdit}${isFlashing ? ` ${css.tableNodeGlow}` : ""}`}
      style={{
        border: `2px solid ${borderColor}`,
        ...(schemaColor ? { borderLeft: `5px solid ${schemaColor}` } : {}),
        boxShadow,
      }}
      onAnimationEnd={() => setFlashingEntityId(null)}
    >
      <Handle type="target" position={Position.Left} />
      <SchemaStrip
        schema={entity.schema ?? null}
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
        <span className={css.colHeaderCellFixed} title="AUTO_INCREMENT">AI</span>
        <span className={css.colHeaderCellFluid}>논리명</span>
        <span className={css.colHeaderCellFluid}>컬럼명</span>
        <span className={css.colHeaderCellType}>타입</span>
        <span className={css.colHeaderSpacer} />
      </div>

      {/* 컬럼 행 */}
      {entity.columns.map((col) => (
        <ColumnRow
          key={col.id}
          col={col}
          entityId={entity.id}
          activeSuggestionColId={activeSuggestionColId}
          suggestions={suggestions}
          onColumnNameInput={handleColumnNameInput}
          onBlur={() => {
            setTimeout(() => clearSuggestions(), 150);
          }}
          onSelectSuggestion={(c, s) => {
            applyCommand((doc) => updateColumn(doc, entity.id, c.id, { name: s.name, type: s.type, nullable: s.nullable, primaryKey: s.pk }));
            clearSuggestions();
          }}
        />
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
      <IndexSection
        entityId={entity.id}
        entityName={entity.name}
        entityColumns={entity.columns}
        entityIndexes={entityIndexes}
      />

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
