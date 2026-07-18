import { useRef, useId, memo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import { getSchemaColor } from "@/shared/utils/schema-colors";
import * as css from "./schema-filter-sidebar.css";

const SchemaFilterSidebarInner = () => {
  const allSchemas = useEditorStore((s) => s.allSchemas);
  const hiddenSchemas = useEditorStore((s) => s.hiddenSchemas);
  const expanded = useEditorStore((s) => s.schemaFilterExpanded);
  const toggleSchema = useEditorStore((s) => s.toggleSchemaVisibility);
  const setExpanded = useEditorStore((s) => s.setSchemaFilterExpanded);
  const schemaColors = useEditorStore((s) => s.schemaColors);
  const setSchemaColor = useEditorStore((s) => s.setSchemaColor);
  const totalCount = useEditorStore((s) => s.document?.entities.length ?? 0);
  const unschemaCount = useEditorStore((s) => s.document?.entities.filter((e) => !e.schema).length ?? 0);
  const schemaEntityCounts = useEditorStore(
    useShallow((s) => {
      const result: Record<string, number> = {};
      for (const e of s.document?.entities ?? []) {
        if (e.schema) result[e.schema] = (result[e.schema] ?? 0) + 1;
      }
      return result;
    })
  );

  const schemas = allSchemas;
  const allVisible = schemas.every((s) => !hiddenSchemas.has(s));

  const toggleAll = () => {
    schemas.forEach((s) => {
      const isHidden = hiddenSchemas.has(s);
      if (allVisible ? !isHidden : isHidden) toggleSchema(s);
    });
  };

  return (
    <div className={css.containerVariants[expanded ? "expanded" : "collapsed"]}>
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        title={expanded ? "필터 패널 접기" : "필터 패널 펼치기"}
        aria-label={expanded ? "필터 패널 접기" : "필터 패널 펼치기"}
        className={css.toggleButton}
      >
        {expanded ? "◀" : "▶"}
      </button>

      {expanded ? (
        <div className={css.expandedContent}>
          <div className={css.sectionTitle}>
            스키마 필터
          </div>

          {/* All */}
          <FilterRow
            color="#1C2B33"
            label="전체"
            count={totalCount}
            checked={allVisible}
            onClick={toggleAll}
          />

          <div className={css.divider} />

          {/* Per-schema */}
          {schemas.map((schema) => (
            <ColorableFilterRow
              key={schema}
              color={getSchemaColor(schema, schemas, schemaColors)}
              label={schema}
              count={schemaEntityCounts[schema] ?? 0}
              checked={!hiddenSchemas.has(schema)}
              onClick={() => toggleSchema(schema)}
              onColorChange={(color) => setSchemaColor(schema, color)}
            />
          ))}

          {/* Unschemed tables */}
          {unschemaCount > 0 && (
            <FilterRow
              color="#CBD2D9"
              label="미분류"
              count={unschemaCount}
              checked={true}
              onClick={() => {}}
              dimmed
            />
          )}
        </div>
      ) : (
        /* Collapsed: dot strip */
        <div className={css.collapsedStrip}>
          {schemas.map((schema) => (
            <button
              key={schema}
              type="button"
              title={schema}
              aria-label={`${schema} 스키마 표시/숨기기`}
              onClick={() => toggleSchema(schema)}
              className={css.collapsedSchemaButton}
              style={{ opacity: hiddenSchemas.has(schema) ? 0.3 : 1 }}
            >
              <div
                className={css.collapsedDot}
                style={{ background: getSchemaColor(schema, schemas, schemaColors) }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const SchemaFilterSidebar = memo(SchemaFilterSidebarInner);

const ColorableFilterRow = ({
  color, label, count, checked, onClick, onColorChange,
}: {
  color: string;
  label: string;
  count: number;
  checked: boolean;
  onClick: () => void;
  onColorChange: (color: string) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const checkboxId = useId();

  return (
    <div className={css.filterRowContainer}>
      {/* 가시성 토글 체크박스 — 실제 input은 시각적으로 숨기고, 아래 label로 시각적 박스를 그린다.
          <label htmlFor>로 연결되므로 클릭/키보드 토글은 브라우저 기본 동작으로 처리된다. */}
      <input
        id={checkboxId}
        type="checkbox"
        checked={checked}
        onChange={() => onClick()}
        aria-label={`${label} 표시/숨기기`}
        className={css.hiddenCheckboxInput}
      />
      <label
        htmlFor={checkboxId}
        aria-hidden="true"
        className={css.filterCheckbox}
        style={{
          "--schema-color": checked ? color : "#CBD2D9",
          "--schema-bg": checked ? color : "transparent",
        } as React.CSSProperties}
      >
        {checked && <span className={css.checkMark}>✓</span>}
      </label>

      {/* 색상 변경 버튼 */}
      <button
        type="button"
        title="색상 변경"
        onClick={() => inputRef.current?.click()}
        className={css.colorPickerDot}
        style={{ background: color }}
        aria-label={`${label} 색상 변경`}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.outlineColor = color; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.outlineColor = "transparent"; }}
      />
      <input
        ref={inputRef}
        type="color"
        value={color}
        onChange={(e) => onColorChange(e.target.value)}
        className={css.hiddenColorInput}
        aria-label={`${label} 스키마 색상`}
      />

      {/* 체크박스와 동일한 input에 연결된 두 번째 label — 라벨 텍스트 클릭으로도 토글 가능하며,
          <label>은 그 자체로 포커스를 받지 않으므로 중복 tabstop이 생기지 않는다. */}
      <label htmlFor={checkboxId} className={css.filterLabel}>
        {label}
      </label>
      <span className={css.filterCount}>{count}</span>
    </div>
  );
};

const FilterRow = ({
  color, label, count, checked, onClick, dimmed,
}: {
  color: string;
  label: string;
  count: number;
  checked: boolean;
  onClick: () => void;
  dimmed?: boolean;
}) => {
  const checkboxId = useId();

  return (
    <div className={css.filterRowVariants[dimmed ? "dimmed" : "normal"]}>
      {/* 실제 input은 시각적으로 숨기고, 아래 label 두 개(체크박스 박스·라벨 텍스트)로
          연결하여 클릭/키보드 토글을 브라우저 기본 동작에 맡긴다. */}
      <input
        id={checkboxId}
        type="checkbox"
        checked={checked}
        onChange={() => onClick()}
        aria-label={`${label} 표시/숨기기`}
        className={css.hiddenCheckboxInput}
      />
      <label
        htmlFor={checkboxId}
        aria-hidden="true"
        className={css.filterRowCheckbox}
        style={{
          "--schema-color": checked ? color : "#CBD2D9",
          "--schema-bg": checked ? color : "transparent",
        } as React.CSSProperties}
      >
        {checked && <span className={css.checkMark}>✓</span>}
      </label>
      <div
        className={css.filterRowDot}
        style={{ background: color }}
      />
      <label htmlFor={checkboxId} className={css.filterRowLabel}>
        {label}
      </label>
      <span className={css.filterRowCount}>{count}</span>
    </div>
  );
};
