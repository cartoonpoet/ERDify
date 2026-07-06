import type { DiagramObjectKind } from "@erdify/domain";

/** SQL 객체 종류 목록 (표시 순서). 종류를 추가하면 아래 Record들이 타입 레벨에서 누락을 강제한다. */
export const OBJECT_KINDS: DiagramObjectKind[] = ["procedure", "function", "trigger", "view"];

/** 종류 → 한글 라벨. ObjectsTabPanel 목록·필터칩과 ObjectEditModal 종류 탭이 공유한다. */
export const OBJECT_KIND_LABELS: Record<DiagramObjectKind, string> = {
  procedure: "프로시저",
  function: "함수",
  trigger: "트리거",
  view: "뷰",
};

/** 종류 → 필터칩 점 색상. */
export const OBJECT_KIND_DOT_COLORS: Record<DiagramObjectKind, string> = {
  procedure: "#60a5fa",
  function: "#34d399",
  trigger: "#fbbf24",
  view: "#a78bfa",
};
