import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { SeedRow, DiagramColumn } from "@erdify/domain";
import { SeedLensRow } from "./SeedLensRow";
import * as css from "./seed-lens.css";

const ROW_HEIGHT = 28;

interface SeedLensGridProps {
  columns: DiagramColumn[];
  rows: SeedRow[];
  onCellChange: (rowIdx: number, colId: string, value: string) => void;
  onRemove: (rowIdx: number) => void;
}

export const SeedLensGrid = ({ columns, rows, onCellChange, onRemove }: SeedLensGridProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <>
      {/* 컬럼 헤더 (sticky) */}
      <div className={css.colHeaderRow}>
        <div className={css.rowNumHeader}>#</div>
        {columns.map((col) => (
          <div key={col.id} className={css.colHeader} title={col.name}>
            {col.name}
          </div>
        ))}
        <div className={css.colHeaderDeletePlaceholder} />
      </div>

      {/* 가상 스크롤 영역 */}
      <div ref={scrollRef} className={css.scrollArea}>
        <div
          className={css.virtualContainer}
          style={{ height: virtualizer.getTotalSize() }}
        >
          {virtualItems.map((vItem) => {
            const row = rows[vItem.index]!;
            return (
              <SeedLensRow
                key={vItem.index}
                row={row}
                rowIdx={vItem.index}
                columns={columns}
                style={{
                  height: ROW_HEIGHT,
                  transform: `translateY(${vItem.start}px)`,
                }}
                onCellChange={onCellChange}
                onRemove={onRemove}
              />
            );
          })}
        </div>
      </div>
    </>
  );
};
