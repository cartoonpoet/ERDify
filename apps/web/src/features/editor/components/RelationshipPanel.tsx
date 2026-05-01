import type { ChangeEvent } from "react";
import { updateRelationship, removeRelationship } from "@erdify/domain";
import type { RelationshipCardinality, ReferentialAction } from "@erdify/domain";
import { useEditorStore } from "../stores/useEditorStore";
import * as css from "./relationship-panel.css";

export const RelationshipPanel = ({ relationshipId }: { relationshipId: string }) => {
  const document = useEditorStore((s) => s.document);
  const applyCommand = useEditorStore((s) => s.applyCommand);
  const setSelectedRelationship = useEditorStore((s) => s.setSelectedRelationship);

  const rel = document?.relationships.find((r) => r.id === relationshipId);
  if (!rel) return null;

  function onToggleIdentifying(identifying: boolean) {
    applyCommand((doc) => updateRelationship(doc, relationshipId, { identifying }));
  }

  function onCardinality(e: ChangeEvent<HTMLSelectElement>) {
    applyCommand((doc) =>
      updateRelationship(doc, relationshipId, { cardinality: e.target.value as RelationshipCardinality })
    );
  }

  function onDeleteChange(e: ChangeEvent<HTMLSelectElement>) {
    applyCommand((doc) =>
      updateRelationship(doc, relationshipId, { onDelete: e.target.value as ReferentialAction })
    );
  }

  function onUpdateChange(e: ChangeEvent<HTMLSelectElement>) {
    applyCommand((doc) =>
      updateRelationship(doc, relationshipId, { onUpdate: e.target.value as ReferentialAction })
    );
  }

  function onDelete() {
    applyCommand((doc) => removeRelationship(doc, relationshipId));
    setSelectedRelationship(null);
  }

  return (
    <div className={css.panel}>
      <div className={css.panelHeader}>
        <span className={css.panelTitle}>관계 설정</span>
        <button onClick={() => setSelectedRelationship(null)} className={css.closeBtn}>×</button>
      </div>

      <div className={css.section}>
        <span className={css.label}>관계 유형</span>
        <div className={css.toggleRow}>
          <button
            className={`${css.toggleBtn}${rel.identifying ? ` ${css.toggleBtnActive}` : ""}`}
            onClick={() => onToggleIdentifying(true)}
          >
            식별 관계
          </button>
          <button
            className={`${css.toggleBtn}${!rel.identifying ? ` ${css.toggleBtnActive}` : ""}`}
            onClick={() => onToggleIdentifying(false)}
          >
            비식별 관계
          </button>
        </div>
      </div>

      <div className={css.section}>
        <span className={css.label}>카디널리티</span>
        <select value={rel.cardinality} onChange={onCardinality} className={css.select}>
          <option value="one-to-one">1:1</option>
          <option value="one-to-many">1:N</option>
          <option value="many-to-one">N:1</option>
        </select>
      </div>

      <div className={css.section}>
        <span className={css.label}>ON DELETE</span>
        <select value={rel.onDelete} onChange={onDeleteChange} className={css.select}>
          <option value="no-action">NO ACTION</option>
          <option value="cascade">CASCADE</option>
          <option value="restrict">RESTRICT</option>
          <option value="set-null">SET NULL</option>
        </select>
      </div>

      <div className={css.section}>
        <span className={css.label}>ON UPDATE</span>
        <select value={rel.onUpdate} onChange={onUpdateChange} className={css.select}>
          <option value="no-action">NO ACTION</option>
          <option value="cascade">CASCADE</option>
          <option value="restrict">RESTRICT</option>
          <option value="set-null">SET NULL</option>
        </select>
      </div>

      <button onClick={onDelete} className={css.deleteBtn}>관계 삭제</button>
    </div>
  );
};
