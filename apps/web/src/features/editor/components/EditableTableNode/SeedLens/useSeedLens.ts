import { useState, useCallback, useRef } from "react";
import type { SeedRow, DiagramEntity } from "@erdify/domain";

export interface UseSeedLensReturn {
  isOpen: boolean;
  localRows: SeedRow[];
  open: () => void;
  close: () => void;
  updateCell: (rowIdx: number, colId: string, value: string) => void;
  addRow: () => void;
  removeRow: (rowIdx: number) => void;
}

export function useSeedLens(
  entity: DiagramEntity,
  onCommit: (rows: SeedRow[]) => void,
): UseSeedLensReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [localRows, setLocalRows] = useState<SeedRow[]>([]);
  const originalRowsRef = useRef<SeedRow[]>([]);

  const open = useCallback(() => {
    const copy = (entity.seedData ?? []).map((r) => ({ ...r }));
    originalRowsRef.current = copy;
    setLocalRows(copy);
    setIsOpen(true);
  }, [entity.seedData]);

  const close = useCallback(() => {
    setIsOpen(false);
    const original = originalRowsRef.current;
    const changed =
      localRows.length !== original.length ||
      localRows.some((row, i) => {
        const orig = original[i];
        if (!orig) return true;
        const keys = new Set([...Object.keys(row), ...Object.keys(orig)]);
        return Array.from(keys).some((k) => row[k] !== orig[k]);
      });
    if (changed) onCommit(localRows);
  }, [localRows, onCommit]);

  const updateCell = useCallback((rowIdx: number, colId: string, value: string) => {
    setLocalRows((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], [colId]: value };
      return next;
    });
  }, []);

  const addRow = useCallback(() => {
    setLocalRows((prev) => [...prev, {} as SeedRow]);
  }, []);

  const removeRow = useCallback((rowIdx: number) => {
    setLocalRows((prev) => prev.filter((_, i) => i !== rowIdx));
  }, []);

  return { isOpen, localRows, open, close, updateCell, addRow, removeRow };
}
