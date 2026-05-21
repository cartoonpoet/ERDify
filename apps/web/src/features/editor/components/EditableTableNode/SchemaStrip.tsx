import { useState } from "react";
import { getSchemaColor } from "@/shared/utils/schema-colors";
import * as css from "./schema-strip.css";

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

  const interactiveProps = interactive
    ? {
        className: "nodrag" as const,
        onClick: () => setOpen((o) => !o),
        onMouseEnter: () => setHovered(true),
        onMouseLeave: () => setHovered(false),
      }
    : {};

  if (!schema) {
    return (
      <div className={css.wrapper}>
        <div
          {...interactiveProps}
          className={`${css.noSchemaStrip}${interactive ? " nodrag" : ""}`}
          style={{
            "--strip-color": hovered ? "#9ca3af" : "#c4cad4",
            "--strip-bg": hovered ? "rgba(0,0,0,.03)" : "transparent",
            "--strip-border": hovered ? "1px solid rgba(0,0,0,.12)" : "1px dashed rgba(0,0,0,.08)",
            "--dot-bg": hovered ? "#cbd5e1" : "#d1d9e0",
          } as React.CSSProperties}
        >
          <div className={css.noSchemaDot} />
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
    <div className={css.wrapper}>
      <div
        {...interactiveProps}
        className={`${css.schemaStrip}${interactive ? " nodrag" : ""}`}
        style={{
          "--strip-border": `1px solid ${color}${hovered ? "40" : "20"}`,
          "--strip-bg": `${color}${hovered ? "18" : "0e"}`,
          "--strip-color": color!,
        } as React.CSSProperties}
      >
        <div className={css.noSchemaDot} style={{ background: color! }} />
        {schema}
        {interactive && (
          <>
            <span className={css.arrowSpan} style={{ opacity: hovered ? 1 : 0 }}>▾</span>
            <span className={css.hintSpan} style={{ opacity: hovered ? 0.55 : 0 }}>
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
    <div className={`nodrag nopan ${css.backdrop}`} onClick={onClose} />
    <div className={`nodrag nopan ${css.dropdownContainer}`}>
      <div className={css.inputWrapper}>
        <input
          autoFocus
          className={`nodrag ${css.dropdownInput}`}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); onCommit(); }
            if (e.key === "Escape") onClose();
          }}
          placeholder="스키마 입력 또는 선택..."
        />
      </div>
      {filtered.map((s) => (
        <button
          key={s}
          type="button"
          className={`nodrag ${s === schema ? css.optionButtonSelected : css.optionButtonDefault}`}
          onMouseDown={(e) => { e.preventDefault(); onSelect(s); }}
        >
          <div
            className={css.optionDot}
            style={{ background: getSchemaColor(s, allSchemas, schemaColors) }}
          />
          {s}
        </button>
      ))}
      {inputVal.trim() && !allSchemas.includes(inputVal.trim()) && (
        <button
          type="button"
          className={`nodrag ${css.createButton}`}
          onMouseDown={(e) => { e.preventDefault(); onCommit(); }}
        >
          + "{inputVal.trim()}" 스키마 생성
        </button>
      )}
      {showRemove && onRemove && (
        <>
          <div className={css.divider} />
          <button
            type="button"
            className={`nodrag ${css.removeButton}`}
            onMouseDown={(e) => { e.preventDefault(); onRemove(); }}
          >
            없음 (해제)
          </button>
        </>
      )}
    </div>
  </>
);
