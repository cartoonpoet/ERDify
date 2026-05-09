import { useState } from "react";
import { DEFAULT_HEADER_COLOR, PRESET_COLORS } from "./constants";
import * as css from "./editable-table-node.css";

export const ColorPicker = ({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (c: string | null) => void;
}) => {
  const [open, setOpen] = useState(false);
  const current = value ?? DEFAULT_HEADER_COLOR;

  return (
    <div className={css.colorPickerWrapper}>
      <button
        type="button"
        className={`${css.colorSwatch} nodrag`}
        style={{ background: current }}
        onClick={() => setOpen((o) => !o)}
        aria-label="헤더 색상 변경"
        aria-expanded={open}
        aria-haspopup="listbox"
      />
      {open && (
        <div className={`${css.colorDropdown} nodrag nopan`}>
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={css.colorOption}
              style={{ background: c, outline: c === current ? "2px solid #fff" : "none" }}
              onMouseDown={(e) => { e.preventDefault(); onChange(c); setOpen(false); }}
              title={c}
            />
          ))}
        </div>
      )}
    </div>
  );
};
