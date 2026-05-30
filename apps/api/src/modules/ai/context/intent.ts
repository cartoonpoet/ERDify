export type ChatIntent = "edit" | "ddl" | "question" | "general";

/** DDL/내보내기 의도 (가장 먼저 검사). */
const DDL_KEYWORDS = ["ddl", "sql", "스크립트", "내보내", "추출", "export", "마이그레이션", "migration"];
/**
 * 변경(edit) 신호. 한국어 편집 동사/명사는 충돌이 없어 그대로 쓰고, 영어는 명령형 동사만
 * 포함한다. 서술형 형용사 'normalized'를 피하려고 'normalize '(뒤 공백)로 매칭한다.
 * 질문 신호보다 우선하므로, 정규화 등 편집 의도가 보이면 행동 쪽으로 기운다(변경은 승인 후 적용됨).
 */
const EDIT_IMPERATIVES = [
  "해줘", "해 줘", "해주세요", "해줄",
  "정규화", "추가", "삭제", "지워", "제거", "수정", "고쳐", "바꿔", "변경", "만들", "생성", "개선", "리팩", "분리", "합쳐", "옮겨", "넣어", "붙여", "연결",
  "add ", "create", "remove", "delete", "drop", "rename", "modify", "refactor", "split", "merge", "improve", "make ", "build", "normalize ",
];
const QUESTION_KEYWORDS = [
  "뭐", "무엇", "무슨", "왜", "어떻게", "어떤", "설명", "알려", "이란", "인가요", "있나요", "있어", "?",
  "what", "why", "how", "which", "explain", "describe",
];

function hasAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

/**
 * 사용자 메시지의 의도를 결정적으로 분류한다(추가 LLM 호출 없음).
 * 우선순위: ddl → edit(명시적 행동 동사) → question → general.
 */
export function classifyIntent(message: string): ChatIntent {
  const m = message.toLowerCase();
  if (hasAny(m, DDL_KEYWORDS)) return "ddl";
  if (hasAny(m, EDIT_IMPERATIVES)) return "edit";
  if (hasAny(m, QUESTION_KEYWORDS)) return "question";
  return "general";
}

/** 의도별 가이드 + 근거기반(grounded) 답변 규칙 블록. 항상 근거 규칙을 포함한다. */
export function buildIntentBlock(intent: ChatIntent): string {
  const grounded = `## Grounded answer rules (무할루시네이션)
- 스키마에 대해 답할 때는 컨텍스트의 "Current diagram" 또는 "VERIFIED FACTS"에 **실제로 존재하는** 테이블/컬럼만 언급하세요.
- 컨텍스트에 보이지 않는 테이블의 세부가 필요하면 먼저 \`getTableDetails\`로 확인한 뒤 답하세요. 추측으로 컬럼명을 만들지 마세요.
- 사실을 모르면 "현재 다이어그램에는 해당 정보가 없다"고 분명히 말하세요.`;

  const perIntent: Record<ChatIntent, string> = {
    edit: `## Detected intent: EDIT (스키마 변경)
- 짧게 분석한 뒤 편집 도구로 변경을 **실제 적용**하세요(줄글로 끝내지 말 것). 변경은 사용자 승인용 diff로 표시됩니다.`,
    ddl: `## Detected intent: DDL/EXPORT
- 사용자가 DDL/SQL을 원하면 현재 스키마를 정확히 반영한 결과를 제시하세요. 스키마를 바꾸지 말고, 변경이 필요하면 먼저 확인하세요.`,
    question: `## Detected intent: QUESTION (정보 질문)
- 근거 규칙을 지켜 답하세요. 명시적 변경 요청이 없으면 임의로 편집 도구를 호출하지 마세요.`,
    general: `## Detected intent: GENERAL
- 의도가 모호하면 합리적으로 가정하되 가정을 한 줄로 밝히세요.`,
  };

  return `${perIntent[intent]}\n${grounded}`;
}
