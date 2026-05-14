import { useState } from "react";
import type { DiagramColumn } from "@erdify/domain";
import * as css from "./editable-table-node.css";

export const IndexColumnSelect = ({
  entityColumns,
  selectedIds,
  onChange,
}: {
  entityColumns: DiagramColumn[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) => {
  const [open, setOpen] = useState(false);
  const label = selectedIds.length === 0
    ? "컬럼 선택"
    : selectedIds
        .map((id) => entityColumns.find((c) => c.id === id)?.name ?? id)
        .join(", ");

  const toggle = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    onChange(next);
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        className={`${css.indexColsBtn} nodrag`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`컬럼 선택: ${label}`}
      >
        {label}
      </button>
      {open && (
        <>
          <div
            className={`${css.indexColsBackdrop} nodrag nopan`}
            onClick={() => setOpen(false)}
          />
          <div className={`${css.indexColsDropdown} nodrag nopan`}>
            {entityColumns.map((col) => (
              <label key={col.id} className={css.indexColOption}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(col.id)}
                  onChange={() => toggle(col.id)}
                  style={{ width: 12, height: 12, accentColor: "#6366f1" }}
                />
                {col.name}
              </label>
            ))}
            {entityColumns.length === 0 && (
              <div style={{ padding: "6px 10px", fontSize: 10, color: "#9ca3af" }}>컬럼 없음</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
