import { useEffect } from "react";
import { updateDiagram } from "@/shared/api/diagrams.api";
import { useEditorStore } from "@/features/editor/store/useEditorStore";

export function useDiagramAutosave(diagramId: string, delayMs = 3000): void {
  const isDirty = useEditorStore((s) => s.isDirty);
  const document = useEditorStore((s) => s.document);
  const clearDirty = useEditorStore((s) => s.clearDirty);

  useEffect(() => {
    if (!isDirty || !document || !diagramId) return;

    const timer = setTimeout(async () => {
      try {
        await updateDiagram(diagramId, { content: document });
        clearDirty();
      } catch {
        // autosave failures are silent — user can still explicitly save a version
      }
    }, delayMs);

    return () => clearTimeout(timer);
  }, [document, diagramId, delayMs, clearDirty]); // isDirty 제거

  // 뒤로가기 등으로 언마운트 시 pending 변경사항 즉시 저장
  useEffect(() => {
    return () => {
      const state = useEditorStore.getState();
      if (state.isDirty && state.document && diagramId) {
        void updateDiagram(diagramId, { content: state.document });
      }
    };
  }, [diagramId]);
}
