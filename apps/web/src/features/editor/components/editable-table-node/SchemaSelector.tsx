import { useState } from "react";
import { getSchemaColor } from "../../../../shared/utils/schema-colors";

export const SchemaSelector = ({
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
