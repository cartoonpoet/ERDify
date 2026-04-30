import type { ChangeEvent } from "react";
import {
  addColumn,
  removeColumn,
  removeEntity,
  renameEntity,
  updateColumn
} from "@erdify/domain";
import type { DiagramColumn } from "@erdify/domain";
import { useEditorStore } from "../stores/useEditorStore";
import * as css from "./entity-panel.css";

const COLUMN_TYPES = [
  "varchar(255)", "text", "int", "bigint", "boolean",
  "timestamp", "uuid", "decimal(10,2)", "json", "jsonb"
];

function makeColumn(): DiagramColumn {
  return {
    id: crypto.randomUUID(),
    name: "column",
    type: "varchar(255)",
    nullable: true,
    primaryKey: false,
    unique: false,
    defaultValue: null,
    comment: null,
    ordinal: 0
  };
}

export const EntityPanel = ({ entityId }: { entityId: string }) => {
  const document = useEditorStore((s) => s.document);
  const applyCommand = useEditorStore((s) => s.applyCommand);
  const setSelectedEntity = useEditorStore((s) => s.setSelectedEntity);

  const entity = document?.entities.find((e) => e.id === entityId);
  if (!entity) return null;

  function onRename(e: ChangeEvent<HTMLInputElement>) {
    applyCommand((doc) => renameEntity(doc, entityId, e.target.value));
  }

  function onDeleteEntity() {
    applyCommand((doc) => removeEntity(doc, entityId));
    setSelectedEntity(null);
  }

  function onAddColumn() {
    applyCommand((doc) => addColumn(doc, entityId, makeColumn()));
  }

  function onColumnName(colId: string, e: ChangeEvent<HTMLInputElement>) {
    applyCommand((doc) => updateColumn(doc, entityId, colId, { name: e.target.value }));
  }

  function onColumnType(colId: string, e: ChangeEvent<HTMLSelectElement>) {
    applyCommand((doc) => updateColumn(doc, entityId, colId, { type: e.target.value }));
  }

  function onTogglePK(colId: string, checked: boolean) {
    applyCommand((doc) => updateColumn(doc, entityId, colId, { primaryKey: checked }));
  }

  function onToggleNullable(colId: string, checked: boolean) {
    applyCommand((doc) => updateColumn(doc, entityId, colId, { nullable: checked }));
  }

  function onDeleteColumn(colId: string) {
    applyCommand((doc) => removeColumn(doc, entityId, colId));
  }

  return (
    <div className={css.panel}>
      <div className={css.panelHeader}>
        <input
          value={entity.name}
          onChange={onRename}
          className={css.nameInput}
        />
        <button
          onClick={onDeleteEntity}
          title="테이블 삭제"
          className={css.deleteEntityBtn}
        >
          ×
        </button>
      </div>

      <div className={css.columnList}>
        {entity.columns.map((col) => (
          <div key={col.id} className={css.columnItem}>
            <div className={css.columnRow}>
              <input
                value={col.name}
                onChange={(e) => onColumnName(col.id, e)}
                className={css.columnInput}
              />
              <button
                onClick={() => onDeleteColumn(col.id)}
                className={css.deleteColumnBtn}
              >
                ×
              </button>
            </div>

            <select
              value={col.type}
              onChange={(e) => onColumnType(col.id, e)}
              className={css.typeSelect}
            >
              {COLUMN_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
              {!COLUMN_TYPES.includes(col.type) && (
                <option value={col.type}>{col.type}</option>
              )}
            </select>

            <div className={css.checkboxRow}>
              <label className={css.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={col.primaryKey}
                  onChange={(e) => onTogglePK(col.id, e.target.checked)}
                />
                PK
              </label>
              <label className={css.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={col.nullable}
                  onChange={(e) => onToggleNullable(col.id, e.target.checked)}
                />
                Nullable
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className={css.panelFooter}>
        <button onClick={onAddColumn} className={css.addColumnBtn}>
          + 컬럼 추가
        </button>
      </div>
    </div>
  );
};
