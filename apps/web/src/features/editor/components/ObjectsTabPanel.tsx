import { useState } from "react";
import type { DiagramObject, DiagramObjectKind } from "@erdify/domain";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import { randomUUID } from "@/shared/utils/uuid";
import {
  OBJECT_KINDS,
  OBJECT_KIND_LABELS,
  OBJECT_KIND_DOT_COLORS,
} from "@/features/editor/constants/object-kind";
import { ObjectEditModal } from "./ObjectEditModal";
import * as css from "./objects-tab-panel.css";

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
  const [activeKinds, setActiveKinds] = useState<Set<DiagramObjectKind>>(new Set(OBJECT_KINDS));
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
    // 필터가 켜진 첫 종류로 시작한다(모두 꺼져 있으면 기본값). 저장 시점엔 handleSaved가
    // 실제 저장된 종류의 필터를 켜므로, 어떤 종류로 저장하든 목록에서 사라지지 않는다.
    const initialKind = OBJECT_KINDS.find((k) => activeKinds.has(k)) ?? DEFAULT_KIND;
    setEditing(makeObject(initialKind));
  };

  const handleModalClose = () => {
    setEditing(null);
  };

  // 저장된 객체의 종류 필터를 자동으로 켜서 방금 저장한 항목이 목록에 보이도록 보장한다.
  const handleSaved = (kind: DiagramObjectKind) => {
    setActiveKinds((prev) => (prev.has(kind) ? prev : new Set(prev).add(kind)));
  };

  const emptyMessage =
    objects.length === 0
      ? "아직 저장된 객체가 없습니다."
      : "선택한 종류의 객체가 없습니다.";

  return (
    <div className={css.container}>
      <div className={css.filterRow}>
        {OBJECT_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            className={css.chip + (activeKinds.has(kind) ? ` ${css.chipOn}` : "")}
            onClick={() => toggleKind(kind)}
          >
            <span className={css.chipDot} style={{ background: OBJECT_KIND_DOT_COLORS[kind] }} />
            {OBJECT_KIND_LABELS[kind]}
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
              <span className={css.kindBadge[object.kind]}>{OBJECT_KIND_LABELS[object.kind]}</span>
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
        <ObjectEditModal
          object={editing}
          mode={mode}
          onClose={handleModalClose}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
};
