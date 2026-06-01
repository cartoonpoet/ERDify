import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { DiagramEntity, SeedRow } from "@erdify/domain";
import { SeedLensGrid } from "./SeedLensGrid";
import { useSeedLens } from "./useSeedLens";
import * as css from "./seed-lens.css";

interface SeedLensProps {
  entity: DiagramEntity;
  onCommit: (rows: SeedRow[]) => void;
}

export const SeedLens = ({ entity, onCommit }: SeedLensProps) => {
  const { isOpen, localRows, open, close, updateCell, addRow, removeRow } =
    useSeedLens(entity, onCommit);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, close]);

  const sortedCols = [...entity.columns].sort((a, b) => a.ordinal - b.ordinal);
  const rowCount = entity.seedData?.length ?? 0;

  return (
    <>
      {/* 트리거 — EditableTableNode Seed Data 섹션 헤더에 삽입 */}
      <button
        type="button"
        className={`${css.seedEditBtn} nodrag`}
        onClick={open}
        aria-label="시드 데이터 편집"
      >
        {rowCount > 0 ? `✎ 편집 (${rowCount}행)` : "+ 추가"}
      </button>

      {/* 렌즈 (Portal) */}
      {isOpen &&
        createPortal(
          <>
            {/* backdrop */}
            <div className={css.backdrop} onClick={close} />

            {/* 패널 */}
            <div
              className={css.panel}
              role="dialog"
              aria-modal
              aria-label={`${entity.name} 시드 데이터 편집`}
            >
              {/* 헤더 */}
              <div className={css.panelHeader}>
                <span className={css.panelTitle}>{entity.name}</span>
                <span className={css.panelBadge}>Seed Lens</span>
                <button
                  type="button"
                  className={css.panelCloseBtn}
                  onClick={close}
                  aria-label="닫기"
                >
                  ✕
                </button>
              </div>

              {/* 그리드 */}
              <SeedLensGrid
                columns={sortedCols}
                rows={localRows}
                onCellChange={updateCell}
                onRemove={removeRow}
              />

              {/* 푸터 */}
              <div className={css.panelFooter}>
                <button type="button" className={css.addRowBtn} onClick={addRow}>
                  + 행 추가
                </button>
                <span className={css.rowCount}>{localRows.length}행</span>
                <span className={css.kbdHint}>Tab 이동 · Esc 닫기</span>
                <button type="button" className={css.doneBtn} onClick={close}>
                  완료
                </button>
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
};
