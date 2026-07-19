import { useState, useRef } from "react";
import type { DiagramColumn } from "@erdify/domain";
import type { ColumnSuggestion } from "@erdify/contracts";
import { suggestColumns } from "@/features/ai/api/ai.api";

interface UseColumnNameSuggestionsReturn {
  suggestions: ColumnSuggestion[];
  activeSuggestionColId: string | null;
  handleColumnNameInput: (columnId: string, value: string) => void;
  clearSuggestions: () => void;
}

export const useColumnNameSuggestions = (
  entityName: string,
  entityColumns: DiagramColumn[]
): UseColumnNameSuggestionsReturn => {
  const [suggestions, setSuggestions] = useState<ColumnSuggestion[]>([]);
  const [activeSuggestionColId, setActiveSuggestionColId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyMatchingSuggestions = (results: ColumnSuggestion[], value: string) => {
    setSuggestions(results.filter((r) => r.name.toLowerCase().startsWith(value.toLowerCase())));
  };

  const handleColumnNameInput = (columnId: string, value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) {
      setSuggestions([]);
      return;
    }
    setActiveSuggestionColId(columnId);
    debounceRef.current = setTimeout(() => {
      const existingColumnNames = entityColumns.map((c) => c.name);
      suggestColumns(entityName, existingColumnNames)
        .then((results) => applyMatchingSuggestions(results, value))
        .catch(() => setSuggestions([]));
    }, 300);
  };

  const clearSuggestions = () => {
    setSuggestions([]);
    setActiveSuggestionColId(null);
  };

  return { suggestions, activeSuggestionColId, handleColumnNameInput, clearSuggestions };
};
