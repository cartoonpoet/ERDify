import type { ChangeEvent } from "react";
import { updateRelationship, removeRelationship } from "@erdify/domain";
import type { RelationshipCardinality, ReferentialAction } from "@erdify/domain";
import { useEditorStore } from "../stores/useEditorStore";
import * as css from "./relationship-popover.css";

type Props = {
  relationshipId: string;
  pos: { x: number; y: number };
};

export const RelationshipPopover = ({ relationshipId, pos }: Props) => {
  const document = useEditorStore((s) => s.document);
  const applyCommand = useEditorStore((s) => s.applyCommand);
  const setSelectedRelationship = useEditorStore((s) => s.setSelectedRelationship);
  const setPopoverPos = useEditorStore((s) => s.setPopoverPos);

  const rel = document?.relationships.find((r) => r.id === relationshipId);
  if (!rel) return null;

  const close = () => {
    setSelectedRelationship(null);
    setPopoverPos(null);
  };

  const onToggleIdentifying = (identifying: boolean) => {
    applyCommand((doc) => updateRelationship(doc, relationshipId, { identifying }));
  };

  const onCardinality = (e: ChangeEvent<HTMLSelectElement>) => {
    applyCommand((doc) =>
      updateRelationship(doc, relationshipId, { cardinality: e.target.value as RelationshipCardinality })
    );
  };

  const onDeleteChange = (e: ChangeEvent<HTMLSelectElement>) => {
    applyCommand((doc) =>
      updateRelationship(doc, relationshipId, { onDelete: e.target.value as ReferentialAction })
    );
  };

  const onUpdateChange = (e: ChangeEvent<HTMLSelectElement>) => {
    applyCommand((doc) =>
      updateRelationship(doc, relationshipId, { onUpdate: e.target.value as ReferentialAction })
    );
  };

  const onDelete = () => {
    applyCommand((doc) => removeRelationship(doc, relationshipId));
    close();
  };

  return (
    <div
      className={`${css.popover} nodrag nopan`}
      style={{ left: pos.x, top: pos.y }}
    >
      <div className={css.arrow} />

      <div className={css.section}>
        <div className={css.sectionLabel}>관계 유형</div>
        <div className={css.toggleRow}>
          <button
            className={`${css.toggleBtn}${rel.identifying ? ` ${css.toggleBtnActive}` : ""}`}
            onClick={() => onToggleIdentifying(true)}
          >
            식별
          </button>
          <button
            className={`${css.toggleBtn}${!rel.identifying ? ` ${css.toggleBtnActive}` : ""}`}
            onClick={() => onToggleIdentifying(false)}
          >
            비식별
          </button>
        </div>
      </div>

      <div className={css.section}>
        <div className={css.sectionLabel}>카디널리티</div>
        <select value={rel.cardinality} onChange={onCardinality} className={css.select}>
          <option value="one-to-one">1:1</option>
          <option value="one-to-many">1:N</option>
          <option value="many-to-one">N:1</option>
        </select>
      </div>

      <div className={css.section}>
        <div className={css.sectionLabel}>ON DELETE</div>
        <select value={rel.onDelete} onChange={onDeleteChange} className={css.select}>
          <option value="no-action">NO ACTION</option>
          <option value="cascade">CASCADE</option>
          <option value="restrict">RESTRICT</option>
          <option value="set-null">SET NULL</option>
        </select>
      </div>

      <div className={css.section}>
        <div className={css.sectionLabel}>ON UPDATE</div>
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
