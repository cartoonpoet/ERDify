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
        <li
          key={s.name}
          className={css.suggestionItem}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(s);
          }}
        >
          <strong>{s.name}</strong>
          <span className={css.suggestionItemType}>{s.type}</span>
          {s.pk && <span className={css.suggestionItemPk}>PK</span>}
        </li>
      ))}
    </ul>
  );
};
