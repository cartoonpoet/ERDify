import { useState } from "react";
import type { KeyboardEvent } from "react";
import { COLUMN_TYPES } from "./constants";
import * as css from "./editable-table-node.css";

export const TypeSelect = ({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (val: string) => void;
  label?: string;
}) => {
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
          {filtered.map((t) => {
            const activeClass = t === value ? ` ${css.typeOptionActive}` : "";
            return (
              <button
                key={t}
                type="button"
                className={`${css.typeOption}${activeClass}`}
                onMouseDown={(e) => { e.preventDefault(); onChange(t); setInputVal(t); setOpen(false); }}
              >
                {t}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
