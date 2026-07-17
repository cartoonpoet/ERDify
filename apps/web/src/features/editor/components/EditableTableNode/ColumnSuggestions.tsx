import type { ColumnSuggestion } from "@erdify/contracts";
import * as css from "./editable-table-node.css";

interface ColumnSuggestionsProps {
  suggestions: ColumnSuggestion[];
  onSelect: (s: ColumnSuggestion) => void;
}

export const ColumnSuggestions = ({ suggestions, onSelect }: ColumnSuggestionsProps) => {
  return (
    <ul className={css.suggestionsList}>
      {suggestions.map((s) => (
        <li key={s.name} className={css.suggestionItem}>
          <button
            type="button"
            className={css.suggestionItemBtn}
            // mousedown에서는 포커스 이동(입력창 blur)만 막고, 실제 선택은 onClick에서 처리한다.
            // 이렇게 해야 키보드로 포커스한 뒤 Enter/Space로 눌러도 동일하게 선택된다.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(s)}
          >
            <strong>{s.name}</strong>
            <span className={css.suggestionItemType}>{s.type}</span>
            {s.pk && <span className={css.suggestionItemPk}>PK</span>}
          </button>
        </li>
      ))}
    </ul>
  );
};
