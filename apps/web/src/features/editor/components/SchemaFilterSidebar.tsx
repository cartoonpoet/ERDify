import { useRef, memo } from "react";
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

  return (
    <div className={css.filterRowContainer}>
      {/* 가시성 토글 체크박스 */}
      <div
        className={css.filterCheckbox}
        style={{
          "--schema-color": checked ? color : "#CBD2D9",
          "--schema-bg": checked ? color : "transparent",
        } as React.CSSProperties}
        role="checkbox"
        aria-checked={checked}
        aria-label={`${label} 표시/숨기기`}
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      >
        {checked && <span className={css.checkMark}>✓</span>}
      </div>

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

      {/* 위 체크박스와 동일한 토글 동작 — 라벨 클릭으로도 토글 가능하되, 키보드 탐색은
          체크박스(role="checkbox") 쪽에서 이미 제공하므로 여기서는 중복 tabstop을 만들지 않는다. */}
      <span
        onClick={onClick}
        className={css.filterLabel}
      >
        {label}
      </span>
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
}) => (
  <div
    onClick={onClick}
    role="checkbox"
    aria-checked={checked}
    aria-label={`${label} 표시/숨기기`}
    tabIndex={0}
    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
    className={css.filterRowVariants[dimmed ? "dimmed" : "normal"]}
  >
    <div
      className={css.filterRowCheckbox}
      style={{
        "--schema-color": checked ? color : "#CBD2D9",
        "--schema-bg": checked ? color : "transparent",
      } as React.CSSProperties}
    >
      {checked && <span className={css.checkMark}>✓</span>}
    </div>
    <div
      className={css.filterRowDot}
      style={{ background: color }}
    />
    <span className={css.filterRowLabel}>
      {label}
    </span>
    <span className={css.filterRowCount}>{count}</span>
  </div>
);
