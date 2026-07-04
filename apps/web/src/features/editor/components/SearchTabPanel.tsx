import { useState, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import { Table2, Columns3 } from "lucide-react";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import { searchEntities, type SearchResult } from "@/features/editor/utils/search-entities";
import * as css from "./search-tab-panel.css";

export const SearchTabPanel = () => {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const document = useEditorStore((s) => s.document);
  const nodes = useEditorStore((s) => s.nodes);
  const applyNodeChanges = useEditorStore((s) => s.applyNodeChanges);
  const setFlashingColumnId = useEditorStore((s) => s.setFlashingColumnId);
  const { fitView } = useReactFlow();

  const allEntities = document?.entities ?? [];
  const results = searchEntities(allEntities, query);

  const navigateTo = (result: SearchResult) => {
    applyNodeChanges(
      nodes.map((n) => ({ type: "select" as const, id: n.id, selected: n.id === result.entityId }))
    );
    fitView({ nodes: [{ id: result.entityId }], duration: 400, maxZoom: 1.2, padding: 0.4 });

    // 컬럼 결과면 해당 컬럼을 글로우, 테이블 결과면 남아있던 컬럼 글로우를 해제한다.
    setFlashingColumnId(result.type === "column" ? result.columnId : null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const result = results[activeIdx];
      if (result) navigateTo(result);
    }
  };

  const resultKey = (result: SearchResult) =>
    result.type === "table" ? `t:${result.entityId}` : `c:${result.columnId}`;

  return (
    <div className={css.container}>
      <div className={css.inputRow}>
        <span className={css.searchIcon}>🔍</span>
        <input
          ref={inputRef}
          autoFocus
          className={css.input}
          placeholder="테이블·컬럼 검색... (↑↓ 탐색, Enter 이동)"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
          onKeyDown={handleKeyDown}
        />
      </div>

      {results.length > 0 ? (
        <div className={css.resultList}>
          {results.map((result, i) => (
            <button
              key={resultKey(result)}
              type="button"
              className={[css.resultItem, i === activeIdx ? css.resultItemActive : ""].join(" ")}
              onClick={() => navigateTo(result)}
              onMouseEnter={() => setActiveIdx(i)}
            >
              {result.type === "table" ? (
                <>
                  <span className={css.resultTypeIcon}>
                    <Table2 size={14} />
                  </span>
                  <span className={css.resultTextBox}>
                    <span className={css.resultName}>{result.entityName}</span>
                  </span>
                  <span className={css.resultMeta}>{result.columnCount}개 컬럼</span>
                </>
              ) : (
                <>
                  <span className={css.resultTypeIcon}>
                    <Columns3 size={14} />
                  </span>
                  <span className={css.resultTextBox}>
                    <span className={css.resultName}>{result.columnName}</span>
                    <span className={css.resultSub}>{result.entityName} &gt; {result.columnName}</span>
                  </span>
                </>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className={css.empty}>검색 결과 없음</div>
      )}

      <div className={css.footer}>
        <span>{results.length}건</span>
      </div>
    </div>
  );
};
