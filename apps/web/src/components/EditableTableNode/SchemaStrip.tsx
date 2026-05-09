import { useState } from "react";
import { getSchemaColor } from "@/utils/schema-colors";

type Props = {
  schema: string | null | undefined;
  allSchemas: string[];
  schemaColors?: Record<string, string>;
  onChange?: (s: string | null) => void;
};

export const SchemaStrip = ({ schema, allSchemas, schemaColors = {}, onChange }: Props) => {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [inputVal, setInputVal] = useState("");

  const color = schema ? getSchemaColor(schema, allSchemas, schemaColors) : null;
  const interactive = !!onChange;

  const filtered = inputVal.trim()
    ? allSchemas.filter((s) => s.toLowerCase().includes(inputVal.toLowerCase()))
    : allSchemas;

  const handleSelect = (s: string) => { onChange?.(s); setOpen(false); setInputVal(""); };
  const handleClose = () => { setOpen(false); setInputVal(""); };
  const commitInput = () => { const t = inputVal.trim(); if (t) handleSelect(t); };

  const stripProps = interactive
    ? {
        className: "nodrag" as const,
        onClick: () => setOpen((o) => !o),
        onMouseEnter: () => setHovered(true),
        onMouseLeave: () => setHovered(false),
        style: { cursor: "pointer" as const, userSelect: "none" as const },
      }
    : {};

  if (!schema) {
    return (
      <div style={{ position: "relative" }}>
        <div
          {...stripProps}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "3px 10px 3px 12px",
            fontSize: 9, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase",
            borderBottom: hovered ? "1px solid rgba(0,0,0,.12)" : "1px dashed rgba(0,0,0,.08)",
            background: hovered ? "rgba(0,0,0,.03)" : "transparent",
            color: hovered ? "#9ca3af" : "#c4cad4",
            transition: "background .12s, color .12s, border-color .12s",
            ...stripProps.style,
          }}
        >
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: hovered ? "#cbd5e1" : "#d1d9e0", flexShrink: 0, transition: "background .12s" }} />
          + 스키마 지정
        </div>
        {open && (
          <SchemaDropdown
            allSchemas={allSchemas}
            schemaColors={schemaColors}
            schema={null}
            inputVal={inputVal}
            setInputVal={setInputVal}
            filtered={filtered}
            onSelect={handleSelect}
            onClose={handleClose}
            onCommit={commitInput}
            showRemove={false}
          />
        )}

      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <div
        {...stripProps}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "3px 10px 3px 12px",
          fontSize: 9, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase",
          borderBottom: `1px solid ${color}${hovered ? "40" : "20"}`,
          background: `${color}${hovered ? "18" : "0e"}`,
          color: color!,
          transition: "background .12s, border-color .12s",
          ...stripProps.style,
        }}
      >
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: color!, flexShrink: 0 }} />
        {schema}
        {interactive && (
          <>
            <span style={{ fontSize: 8, opacity: hovered ? 1 : 0, transition: "opacity .12s", marginLeft: 2 }}>▾</span>
            <span style={{
              marginLeft: "auto", fontSize: 8,
              opacity: hovered ? 0.55 : 0, transition: "opacity .12s",
              fontFamily: "sans-serif", letterSpacing: "normal",
              textTransform: "none", fontWeight: 500,
            }}>
              스키마 변경
            </span>
          </>
        )}
      </div>
      {open && (
        <SchemaDropdown
          allSchemas={allSchemas}
          schemaColors={schemaColors}
          schema={schema}
          inputVal={inputVal}
          setInputVal={setInputVal}
          filtered={filtered}
          onSelect={handleSelect}
          onRemove={() => { onChange?.(null); handleClose(); }}
          onClose={handleClose}
          onCommit={commitInput}
          showRemove
        />
      )}
    </div>
  );
};

const SchemaDropdown = ({
  allSchemas,
  schemaColors,
  schema,
  inputVal,
  setInputVal,
  filtered,
  onSelect,
  onRemove,
  onClose,
  onCommit,
  showRemove,
}: {
  allSchemas: string[];
  schemaColors: Record<string, string>;
  schema: string | null;
  inputVal: string;
  setInputVal: (v: string) => void;
  filtered: string[];
  onSelect: (s: string) => void;
  onRemove?: () => void;
  onClose: () => void;
  onCommit: () => void;
  showRemove: boolean;
}) => (
  <>
    <div className="nodrag nopan" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 999 }} />
    <div
      className="nodrag nopan"
      style={{
        position: "absolute", top: "calc(100% + 3px)", left: 0, zIndex: 1000,
        background: "#fff", border: "1px solid #DEE3E9", borderRadius: 8,
        boxShadow: "0 4px 16px rgba(0,0,0,.12)", minWidth: 168, overflow: "hidden",
      }}
    >
      <div style={{ padding: "6px 8px", borderBottom: "1px solid #F1F4F7" }}>
        <input
          autoFocus
          className="nodrag"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); onCommit(); }
            if (e.key === "Escape") onClose();
          }}
          placeholder="스키마 입력 또는 선택..."
          style={{
            width: "100%", padding: "4px 8px", fontSize: 11,
            border: "1px solid #DEE3E9", borderRadius: 5,
            outline: "none", boxSizing: "border-box",
          }}
        />
      </div>
      {filtered.map((s) => (
        <button
          key={s}
          type="button"
          className="nodrag"
          onMouseDown={(e) => { e.preventDefault(); onSelect(s); }}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            width: "100%", padding: "6px 10px",
            background: s === schema ? "#EEF4FF" : "none",
            border: "none", textAlign: "left", cursor: "pointer",
            fontSize: 11, color: s === schema ? "#0064E0" : "#374151",
            fontWeight: s === schema ? 500 : 400,
          }}
        >
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: getSchemaColor(s, allSchemas, schemaColors), flexShrink: 0 }} />
          {s}
        </button>
      ))}
      {inputVal.trim() && !allSchemas.includes(inputVal.trim()) && (
        <button
          type="button"
          className="nodrag"
          onMouseDown={(e) => { e.preventDefault(); onCommit(); }}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            width: "100%", padding: "6px 10px",
            background: "none", border: "none", textAlign: "left",
            cursor: "pointer", fontSize: 11, color: "#0064E0",
          }}
        >
          + "{inputVal.trim()}" 스키마 생성
        </button>
      )}
      {showRemove && onRemove && (
        <>
          <div style={{ height: 1, background: "#F1F4F7" }} />
          <button
            type="button"
            className="nodrag"
            onMouseDown={(e) => { e.preventDefault(); onRemove(); }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              width: "100%", padding: "6px 10px",
              background: "none", border: "none", textAlign: "left",
              cursor: "pointer", fontSize: 11, color: "#9CA3AF",
            }}
          >
            없음 (해제)
          </button>
        </>
      )}
    </div>
  </>
);
