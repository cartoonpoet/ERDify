import { useEditorStore } from "../stores/useEditorStore";
import { getSchemaColor, getSchemasFromDocument } from "../../../shared/utils/schema-colors";

export const SchemaFilterSidebar = () => {
  const document = useEditorStore((s) => s.document);
  const hiddenSchemas = useEditorStore((s) => s.hiddenSchemas);
  const expanded = useEditorStore((s) => s.schemaFilterExpanded);
  const toggleSchema = useEditorStore((s) => s.toggleSchemaVisibility);
  const setExpanded = useEditorStore((s) => s.setSchemaFilterExpanded);

  if (!document) return null;

  const schemas = getSchemasFromDocument(document.entities);
  const totalCount = document.entities.length;
  const unschemaCount = document.entities.filter((e) => !e.schema).length;
  const allVisible = schemas.every((s) => !hiddenSchemas.has(s));

  const toggleAll = () => {
    schemas.forEach((s) => {
      const isHidden = hiddenSchemas.has(s);
      if (allVisible ? !isHidden : isHidden) toggleSchema(s);
    });
  };

  return (
    <div
      style={{
        width: expanded ? 196 : 40,
        minWidth: expanded ? 196 : 40,
        background: "#fff",
        borderRight: "1px solid #DEE3E9",
        display: "flex",
        flexDirection: "column",
        transition: "width .18s ease, min-width .18s ease",
        overflow: "hidden",
        position: "relative",
        flexShrink: 0,
      }}
    >
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        title={expanded ? "필터 패널 접기" : "필터 패널 펼치기"}
        aria-label={expanded ? "필터 패널 접기" : "필터 패널 펼치기"}
        style={{
          position: "absolute",
          top: 8,
          right: 6,
          width: 24,
          height: 24,
          borderRadius: 6,
          background: "#F1F4F7",
          border: "1px solid #DEE3E9",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          color: "#5D6C7B",
          zIndex: 10,
          flexShrink: 0,
        }}
      >
        {expanded ? "◀" : "▶"}
      </button>

      {expanded ? (
        <div style={{ padding: "40px 10px 10px", display: "flex", flexDirection: "column", gap: 3, flex: 1, overflow: "hidden" }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#5D6C7B", textTransform: "uppercase", letterSpacing: "0.07em", padding: "0 4px", marginBottom: 2 }}>
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

          <div style={{ height: 1, background: "#DEE3E9", margin: "3px 0" }} />

          {/* Per-schema */}
          {schemas.map((schema) => (
            <FilterRow
              key={schema}
              color={getSchemaColor(schema, schemas)}
              label={schema}
              count={document.entities.filter((e) => e.schema === schema).length}
              checked={!hiddenSchemas.has(schema)}
              onClick={() => toggleSchema(schema)}
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
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0 8px", gap: 2 }}>
          {schemas.map((schema) => (
            <div
              key={schema}
              title={schema}
              onClick={() => toggleSchema(schema)}
              style={{
                width: 28, height: 28, borderRadius: 7, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: hiddenSchemas.has(schema) ? 0.3 : 1,
              }}
            >
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: getSchemaColor(schema, schemas) }} />
            </div>
          ))}
        </div>
      )}
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
    style={{
      display: "flex", alignItems: "center", gap: 7,
      padding: "5px 4px", borderRadius: 6, cursor: dimmed ? "default" : "pointer",
      opacity: dimmed ? 0.45 : 1,
    }}
  >
    <div
      style={{
        width: 13, height: 13, borderRadius: 3,
        border: `1.5px solid ${checked ? color : "#CBD2D9"}`,
        background: checked ? color : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}
    >
      {checked && <span style={{ color: "#fff", fontSize: 9, fontWeight: 700, lineHeight: 1 }}>✓</span>}
    </div>
    <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
    <span style={{ fontSize: 12, color: "#1C2B33", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
      {label}
    </span>
    <span style={{ fontSize: 10, color: "#5D6C7B" }}>{count}</span>
  </div>
);
