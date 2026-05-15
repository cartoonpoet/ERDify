import { memo, useCallback } from "react";
import type { CSSProperties } from "react";
import type { SeedRow, DiagramColumn } from "@erdify/domain";
import * as css from "./seed-lens.css";

interface SeedLensRowProps {
  row: SeedRow;
  rowIdx: number;
  columns: DiagramColumn[];
  style: CSSProperties;
  onCellChange: (rowIdx: number, colId: string, value: string) => void;
  onRemove: (rowIdx: number) => void;
}

export const SeedLensRow = memo(
  ({ row, rowIdx, columns, style, onCellChange, onRemove }: SeedLensRowProps) => {
    const handleChange = useCallback(
      (colId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        onCellChange(rowIdx, colId, e.target.value);
      },
      [rowIdx, onCellChange],
    );

    const handleRemove = useCallback(() => onRemove(rowIdx), [rowIdx, onRemove]);

    return (
      <div className={css.gridRow} style={style}>
        <div className={css.rowNum}>{rowIdx + 1}</div>
        {columns.map((col) => (
          <input
            key={col.id}
            className={css.cell}
            value={row[col.id] ?? ""}
            placeholder="NULL"
            aria-label={`행 ${rowIdx + 1} ${col.name}`}
            onChange={(e) => handleChange(col.id, e)}
          />
        ))}
        <button
          type="button"
          className={css.rowDeleteBtn}
          onClick={handleRemove}
          aria-label={`${rowIdx + 1}번 행 삭제`}
          title="행 삭제"
        >
          ×
        </button>
      </div>
    );
  },
  (prev, next) =>
    prev.row === next.row &&
    prev.rowIdx === next.rowIdx &&
    prev.style === next.style &&
    prev.onCellChange === next.onCellChange &&
    prev.onRemove === next.onRemove,
);

SeedLensRow.displayName = "SeedLensRow";
