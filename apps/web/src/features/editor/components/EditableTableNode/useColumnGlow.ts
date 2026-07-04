import type { AnimationEvent } from "react";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import * as css from "./editable-table-node.css";

// 컬럼 행 글로우(검색 이동 하이라이트) 구독 로직. 편집/읽기전용 컬럼 행이 공유한다.
export const useColumnGlow = (colId: string) => {
  const isFlashing = useEditorStore((s) => s.flashingColumnId === colId);
  const setFlashingColumnId = useEditorStore((s) => s.setFlashingColumnId);

  return {
    glowClassName: isFlashing ? css.columnRowGlow : "",
    // 글로우 애니메이션이 이 행 자신에서 끝났을 때만 리셋한다.
    // 자식(TypeSelect/ColumnSuggestions 등)의 애니메이션이 버블링되어
    // 플래싱 상태를 조기에 해제하지 않도록 target === currentTarget으로 가드한다.
    onGlowAnimationEnd: (e: AnimationEvent) => {
      if (e.target === e.currentTarget) setFlashingColumnId(null);
    },
  };
};
