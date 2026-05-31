import { useEffect } from "react";
import { updateDiagram } from "@/shared/api/diagrams.api";
import { useEditorStore } from "@/features/editor/store/useEditorStore";

export function useDiagramAutosave(diagramId: string, delayMs = 3000): void {
  const isDirty = useEditorStore((s) => s.isDirty);
  const document = useEditorStore((s) => s.document);
  const clearDirty = useEditorStore((s) => s.clearDirty);
  const isCollaborating = useEditorStore((s) => s.isCollaborating);

  useEffect(() => {
    // 협업 연결 중에는 협업 레이어(Automerge)가 단일 지속성 권위. HTTP 자동저장이 끼면
    // 두 writer가 같은 content를 덮어써 레이스가 생기므로, 이때는 자동저장을 건너뛴다.
    if (isCollaborating || !isDirty || !document || !diagramId) return;

    const timer = setTimeout(async () => {
      try {
        await updateDiagram(diagramId, { content: document });
        clearDirty();
      } catch {
        // autosave failures are silent — user can still explicitly save a version
      }
    }, delayMs);

    return () => clearTimeout(timer);
  }, [document, diagramId, delayMs, clearDirty, isCollaborating]); // isDirty 제거

  // 뒤로가기 등으로 언마운트 시 pending 변경사항 즉시 저장
  // (협업 중이면 서버가 leaveRoom 시 Automerge를 persist하므로 여기선 저장하지 않는다)
  useEffect(() => {
    return () => {
      const state = useEditorStore.getState();
      if (!state.isCollaborating && state.isDirty && state.document && diagramId) {
        void updateDiagram(diagramId, { content: state.document });
      }
    };
  }, [diagramId]);
}
