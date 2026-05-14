import type { CSSProperties, MouseEvent } from "react";
import { useReactFlow } from "@xyflow/react";
import { addEntity, updateEntityPosition } from "@erdify/domain";
import { randomUUID } from "@/shared/utils/uuid";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import { computeAutoLayout } from "@/shared/utils/canvas-layout";

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

  if (!document) return null;

  const menuItemStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: "9px 14px",
    background: "none",
    border: "none",
    textAlign: "left",
    cursor: "pointer",
    color: "#374151",
    fontSize: 12,
    fontFamily: "monospace",
  };

  const onEnter = (e: MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.background = "#f1f5f9"; };
  const onLeave = (e: MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.background = "none"; };

  return (
    <div
      className="nodrag nopan"
      style={{
        position: "absolute",
        left: menuX,
        top: menuY,
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)",
        zIndex: 1000,
        minWidth: 160,
        fontSize: 12,
        fontFamily: "monospace",
        overflow: "hidden",
      }}
    >
      <button type="button" onClick={handleAddTable} style={menuItemStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>
        <span style={{ fontSize: 14 }}>+</span>
        테이블 추가
      </button>
      <div style={{ height: 1, background: "#f1f5f9", margin: "0 8px" }} />
      <button type="button" onClick={handleAutoLayout} style={menuItemStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>
        <span style={{ fontSize: 13 }}>⊞</span>
        테이블 자동 정렬
      </button>
      <div style={{ height: 1, background: "#f1f5f9", margin: "0 8px" }} />
      <button
        type="button"
        onClick={() => { setGroupViewEnabled(!groupViewEnabled); onClose(); }}
        style={menuItemStyle}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        <span style={{ fontSize: 13 }}>{groupViewEnabled ? "◻" : "▦"}</span>
        {groupViewEnabled ? "그룹 숨기기" : "그룹 보기"}
      </button>
    </div>
  );
};
