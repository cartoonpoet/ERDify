import { useReactFlow } from "@xyflow/react";
import { addEntity, updateEntityPosition } from "@erdify/domain";
import { randomUUID } from "@/shared/utils/uuid";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import { computeAutoLayout } from "@/shared/utils/canvas-layout";
import * as css from "./canvas-context-menu.css";

export interface CanvasContextMenuProps {
  menuX: number;
  menuY: number;
  clientX: number;
  clientY: number;
  onClose: () => void;
}

export const CanvasContextMenu = ({ menuX, menuY, clientX, clientY, onClose }: CanvasContextMenuProps) => {
  const { screenToFlowPosition, fitView, getNodes } = useReactFlow();
  const applyCommand = useEditorStore((s) => s.applyCommand);
  const document = useEditorStore((s) => s.document);
  const groupViewEnabled = useEditorStore((s) => s.groupViewEnabled);
  const setGroupViewEnabled = useEditorStore((s) => s.setGroupViewEnabled);

  const handleAddTable = () => {
    const flowPos = screenToFlowPosition({ x: clientX, y: clientY });
    const entityId = randomUUID();
    applyCommand((doc) => {
      const next = addEntity(doc, { id: entityId, name: `Table_${doc.entities.length + 1}` });
      return updateEntityPosition(next, entityId, flowPos);
    });
    onClose();
  };

  const handleAutoLayout = () => {
    if (!document) return;
    const measuredSizes = new Map(
      getNodes().map((n) => [n.id, { w: n.measured?.width ?? 280, h: n.measured?.height ?? 120 }])
    );
    const positions = computeAutoLayout(document, measuredSizes);
    applyCommand((doc) => {
      let next = doc;
      for (const entity of doc.entities) {
        const pos = positions[entity.id];
        if (pos) next = updateEntityPosition(next, entity.id, pos);
      }
      return next;
    });
    setTimeout(() => fitView({ duration: 400, padding: 0.08 }), 50);
    onClose();
  };

  const handleToggleGroupView = () => { setGroupViewEnabled(!groupViewEnabled); onClose(); };

  if (!document) return null;

  return (
    <div
      className={`nodrag nopan ${css.menu}`}
      style={{ left: menuX, top: menuY }}
    >
      <button type="button" onClick={handleAddTable} className={css.menuItem}>
        <span className={css.iconLg}>+</span>
        테이블 추가
      </button>
      <div className={css.separator} />
      <button type="button" onClick={handleAutoLayout} className={css.menuItem}>
        <span className={css.iconSm}>⊞</span>
        테이블 자동 정렬
      </button>
      <div className={css.separator} />
      <button
        type="button"
        onClick={handleToggleGroupView}
        className={css.menuItem}
      >
        <span className={css.iconSm}>{groupViewEnabled ? "◻" : "▦"}</span>
        {groupViewEnabled ? "그룹 숨기기" : "그룹 보기"}
      </button>
    </div>
  );
};
