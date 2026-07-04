import type { DiagramColumn, DiagramIndex } from "@erdify/domain";
import { addIndex, removeIndex, updateIndex } from "@erdify/domain";
import { IMEInput } from "./IMEInput";
import { IndexColumnSelect } from "./IndexColumnSelect";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import * as css from "./editable-table-node.css";
import { makeIndex } from "./constants";

interface IndexSectionProps {
  entityId: string;
  entityName: string;
  entityColumns: DiagramColumn[];
  entityIndexes: DiagramIndex[];
}

export const IndexSection = ({
  entityId,
  entityName,
  entityColumns,
  entityIndexes,
}: IndexSectionProps) => {
  const applyCommand = useEditorStore((s) => s.applyCommand);

  return (
    <div className={css.indexSection}>
      <div className={css.indexSectionHeader}>
        <span className={css.indexSectionLabel}>Indexes</span>
        <button
          type="button"
          className={`${css.indexAddBtn} nodrag`}
          onClick={() =>
            applyCommand((doc) => addIndex(doc, makeIndex(entityId, entityName)))
          }
          aria-label="인덱스 추가"
        >
          + 추가
        </button>
      </div>

      {entityIndexes.map((idx) => (
        <div key={idx.id} className={css.indexRow}>
          <IMEInput
            className={`${css.indexNameInput} nodrag nokey`}
            value={idx.name}
            placeholder="인덱스명..."
            aria-label="인덱스명"
            onChange={(v) => applyCommand((doc) => updateIndex(doc, idx.id, { name: v }))}
          />
          <IndexColumnSelect
            entityColumns={entityColumns}
            selectedIds={idx.columnIds}
            onChange={(ids) => applyCommand((doc) => updateIndex(doc, idx.id, { columnIds: ids }))}
          />
          <button
            type="button"
            className={`${css.indexUniqueToggle}${idx.unique ? ` ${css.indexUniqueActive}` : ""} nodrag`}
            onClick={() => applyCommand((doc) => updateIndex(doc, idx.id, { unique: !idx.unique }))}
            aria-pressed={idx.unique}
            aria-label={idx.unique ? "UNIQUE 인덱스 (클릭하면 일반 인덱스로 변경)" : "일반 인덱스 (클릭하면 UNIQUE로 변경)"}
          >
            {idx.unique ? "UNIQUE" : "INDEX"}
          </button>
          <button
            type="button"
            className={`${css.indexDeleteBtn} nodrag`}
            onClick={() => applyCommand((doc) => removeIndex(doc, idx.id))}
            aria-label={`${idx.name || "인덱스"} 삭제`}
            title="인덱스 삭제"
          >
            ×
          </button>
        </div>
      ))}

      {entityIndexes.length === 0 && (
        <div className={css.emptyIndexText}>
          인덱스 없음
        </div>
      )}
    </div>
  );
};
