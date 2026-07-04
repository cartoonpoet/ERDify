import type { DiagramColumn } from "@erdify/domain";
import type { ColumnSuggestion } from "@erdify/contracts";
import { IMEInput } from "./IMEInput";
import { TypeSelect } from "./TypeSelect";
import { ColumnSuggestions } from "./ColumnSuggestions";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import * as css from "./editable-table-node.css";
import { removeColumn, updateColumn } from "@erdify/domain";

interface ColumnRowProps {
  col: DiagramColumn;
  entityId: string;
  activeSuggestionColId: string | null;
  suggestions: ColumnSuggestion[];
  onColumnNameInput: (columnId: string, value: string) => void;
  onBlur: () => void;
  onSelectSuggestion: (col: DiagramColumn, s: ColumnSuggestion) => void;
}

export const ColumnRow = ({
  col,
  entityId,
  activeSuggestionColId,
  suggestions,
  onColumnNameInput,
  onBlur,
  onSelectSuggestion,
}: ColumnRowProps) => {
  const applyCommand = useEditorStore((s) => s.applyCommand);
  const fkColumnIds = useEditorStore((s) => s.fkColumnIds);

  return (
    <div className={css.editColumnItem}>
      {/* PK */}
      <div className={css.checkboxCell}>
        <input
          type="checkbox"
          className={`${css.rowCheckbox} nodrag`}
          checked={col.primaryKey}
          aria-label={`${col.name} PK`}
          onChange={(e) =>
            applyCommand((doc) => updateColumn(doc, entityId, col.id, { primaryKey: e.target.checked }))
          }
        />
      </div>
      {/* FK (read-only) */}
      <div className={css.fkDotCell}>
        {fkColumnIds.has(col.id) && <span className={css.fkDot} aria-label="FK" title="Foreign Key" />}
      </div>
      {/* NULL */}
      <div className={css.checkboxCell}>
        <input
          type="checkbox"
          className={`${css.rowCheckbox} nodrag`}
          checked={col.nullable}
          aria-label={`${col.name} NULL 허용`}
          onChange={(e) =>
            applyCommand((doc) => updateColumn(doc, entityId, col.id, { nullable: e.target.checked }))
          }
        />
      </div>
      {/* UQ */}
      <div className={css.checkboxCell}>
        <input
          type="checkbox"
          className={`${css.rowCheckbox} nodrag`}
          checked={col.unique}
          aria-label={`${col.name} UNIQUE`}
          onChange={(e) =>
            applyCommand((doc) => updateColumn(doc, entityId, col.id, { unique: e.target.checked }))
          }
        />
      </div>
      {/* AI (AUTO_INCREMENT) */}
      <div className={css.checkboxCell}>
        <input
          type="checkbox"
          className={`${css.rowCheckbox} nodrag`}
          checked={col.autoIncrement ?? false}
          aria-label={`${col.name} AUTO_INCREMENT`}
          onChange={(e) =>
            applyCommand((doc) => updateColumn(doc, entityId, col.id, { autoIncrement: e.target.checked }))
          }
        />
      </div>
      {/* 논리명 */}
      <IMEInput
        className={`${css.logicalNameInput} nodrag nokey`}
        value={col.comment ?? ""}
        placeholder="논리명..."
        aria-label={`${col.name} 논리명`}
        onChange={(v) => applyCommand((doc) => updateColumn(doc, entityId, col.id, { comment: v || null }))}
      />
      {/* 컬럼명 */}
      <div
        className={css.colNameWrapper}
        onInput={(e) => {
          const target = e.target as HTMLInputElement;
          onColumnNameInput(col.id, target.value);
        }}
        onBlur={onBlur}
      >
        <IMEInput
          className={`${css.columnNameInput} nodrag nokey`}
          value={col.name}
          aria-label="컬럼명"
          onChange={(v) => applyCommand((doc) => updateColumn(doc, entityId, col.id, { name: v }))}
        />
        {activeSuggestionColId === col.id && suggestions.length > 0 && (
          <ColumnSuggestions
            suggestions={suggestions}
            onSelect={(s) => onSelectSuggestion(col, s)}
          />
        )}
      </div>
      {/* 타입 */}
      <TypeSelect
        value={col.type}
        onChange={(val) =>
          applyCommand((doc) => updateColumn(doc, entityId, col.id, { type: val }))
        }
        label={`${col.name} 타입`}
      />
      {/* 삭제 */}
      <button
        type="button"
        className={`${css.deleteColBtn} nodrag`}
        onClick={() => applyCommand((doc) => removeColumn(doc, entityId, col.id))}
        aria-label={`${col.name} 컬럼 삭제`}
        title="컬럼 삭제"
      >
        ×
      </button>
    </div>
  );
};
