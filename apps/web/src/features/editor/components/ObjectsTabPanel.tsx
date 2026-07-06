import { useState } from "react";
import type { DiagramObject, DiagramObjectKind } from "@erdify/domain";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import { randomUUID } from "@/shared/utils/uuid";
import { ObjectEditModal } from "./ObjectEditModal";
import * as css from "./objects-tab-panel.css";

const ALL_KINDS: DiagramObjectKind[] = ["procedure", "function", "trigger", "view"];

const KIND_LABELS: Record<DiagramObjectKind, string> = {
  procedure: "프로시저",
  function: "함수",
  trigger: "트리거",
  view: "뷰",
};

const KIND_DOT_COLORS: Record<DiagramObjectKind, string> = {
  procedure: "#60a5fa",
  function: "#34d399",
  trigger: "#fbbf24",
  view: "#a78bfa",
};

const DEFAULT_KIND: DiagramObjectKind = "procedure";

const makeObject = (kind: DiagramObjectKind): DiagramObject => ({
  id: randomUUID(),
  kind,
  name: "",
  sql: "",
});

interface ObjectsTabPanelProps {
  diagramId: string;
}

export const ObjectsTabPanel = ({ diagramId: _diagramId }: ObjectsTabPanelProps) => {
  const [activeKinds, setActiveKinds] = useState<Set<DiagramObjectKind>>(new Set(ALL_KINDS));
  const [editing, setEditing] = useState<DiagramObject | null>(null);
  const [mode, setMode] = useState<"add" | "edit">("add");

  const document = useEditorStore((s) => s.document);
  const canEdit = useEditorStore((s) => s.canEdit);

  const objects = document?.objects ?? [];
  const filteredObjects = objects.filter((o) => activeKinds.has(o.kind));

  const toggleKind = (kind: DiagramObjectKind) => {
    setActiveKinds((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) {
        next.delete(kind);
      } else {
        next.add(kind);
      }
      return next;
    });
  };

  const handleRowClick = (object: DiagramObject) => {
    setMode("edit");
    setEditing(object);
  };

  const handleAddClick = () => {
    setMode("add");
    setEditing(makeObject(DEFAULT_KIND));
  };

  const handleModalClose = () => {
    setEditing(null);
  };

  const emptyMessage =
    objects.length === 0
      ? "아직 저장된 객체가 없습니다."
      : "선택한 종류의 객체가 없습니다.";

  return (
    <div className={css.container}>
      <div className={css.filterRow}>
        {ALL_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            className={`${css.chip}${activeKinds.has(kind) ? ` ${css.chipOn}` : ""}`}
            onClick={() => toggleKind(kind)}
          >
            <span className={css.chipDot} style={{ background: KIND_DOT_COLORS[kind] }} />
            {KIND_LABELS[kind]}
          </button>
        ))}
      </div>

      <div className={css.listBody}>
        {filteredObjects.length === 0 ? (
          <p className={css.emptyText}>{emptyMessage}</p>
        ) : (
          filteredObjects.map((object) => (
            <button
              key={object.id}
              type="button"
              className={css.objectRow}
              onClick={() => handleRowClick(object)}
            >
              <span className={css.kindBadge[object.kind]}>{KIND_LABELS[object.kind]}</span>
              <span className={css.objectName}>{object.name || "(이름 없음)"}</span>
            </button>
          ))
        )}
      </div>

      <div className={css.addRow}>
        <button type="button" className={css.addBtn} onClick={handleAddClick} disabled={!canEdit}>
          ＋ 객체 추가
        </button>
      </div>

      {editing !== null && (
        <ObjectEditModal object={editing} mode={mode} onClose={handleModalClose} />
      )}
    </div>
  );
};
