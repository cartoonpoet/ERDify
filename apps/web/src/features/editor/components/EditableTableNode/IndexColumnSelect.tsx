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
    <div className={css.indexColWrapper}>
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
                  className={css.indexColCheckbox}
                />
                {col.name}
              </label>
            ))}
            {entityColumns.length === 0 && (
              <div className={css.indexColEmpty}>컬럼 없음</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
