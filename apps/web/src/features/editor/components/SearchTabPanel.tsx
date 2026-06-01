import { useState, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import * as css from "./search-tab-panel.css";

export const SearchTabPanel = () => {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const document = useEditorStore((s) => s.document);
  const nodes = useEditorStore((s) => s.nodes);
  const applyNodeChanges = useEditorStore((s) => s.applyNodeChanges);
  const { fitView } = useReactFlow();

  const allEntities = document?.entities ?? [];
  const results = query.trim()
    ? allEntities.filter(
        (e) =>
          e.name.toLowerCase().includes(query.toLowerCase()) ||
          (e.comment ?? "").toLowerCase().includes(query.toLowerCase())
      )
    : allEntities;

  const navigateTo = (entityId: string) => {
    applyNodeChanges(
      nodes.map((n) => ({ type: "select" as const, id: n.id, selected: n.id === entityId }))
    );
    fitView({ nodes: [{ id: entityId }], duration: 400, maxZoom: 1.2, padding: 0.4 });
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
      const entity = results[activeIdx];
      if (entity) navigateTo(entity.id);
    }
  };

  return (
    <div className={css.container}>
      <div className={css.inputRow}>
        <span className={css.searchIcon}>🔍</span>
        <input
          ref={inputRef}
          autoFocus
          className={css.input}
          placeholder="테이블 검색... (↑↓ 탐색, Enter 이동)"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
          onKeyDown={handleKeyDown}
        />
      </div>

      {results.length > 0 ? (
        <div className={css.resultList}>
          {results.map((entity, i) => (
            <button
              key={entity.id}
              type="button"
              className={[css.resultItem, i === activeIdx ? css.resultItemActive : ""].join(" ")}
              onClick={() => navigateTo(entity.id)}
              onMouseEnter={() => setActiveIdx(i)}
            >
              <span className={css.resultName}>{entity.name}</span>
              <span className={css.resultMeta}>{entity.columns.length}개 컬럼</span>
            </button>
          ))}
        </div>
      ) : (
        <div className={css.empty}>검색 결과 없음</div>
      )}

      <div className={css.footer}>
        <span>{results.length}/{allEntities.length} 테이블</span>
      </div>
    </div>
  );
};
