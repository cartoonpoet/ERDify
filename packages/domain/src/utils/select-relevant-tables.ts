import type { DiagramDocument } from "../types/index.js";

/**
 * 사용자 질의와 가장 관련 있는 테이블을 결정적으로 선택한다(스키마-RAG).
 *
 * 큰 다이어그램에서 전체를 프롬프트에 넣을 수 없을 때, 질의에 관련된 테이블만
 * "완전한 형태(컬럼/관계 포함)"로 포함하기 위한 선택기. 순수 함수이며 동일 입력에
 * 항상 동일 출력을 반환한다.
 *
 * 동작:
 * 1. 질의 토큰과 테이블 이름/논리명/컬럼명의 어휘 겹침으로 점수를 매긴다.
 * 2. 점수>0인 테이블을 상위부터 선택한다.
 * 3. 선택된 테이블의 1-hop FK 이웃(관계로 연결된 테이블)을 더해 부분 그래프를 완결한다.
 * 4. 어떤 테이블도 매칭되지 않으면(예: 영문 토큰 없는 한국어 질의) 관계 차수(degree)가
 *    높은 중심 테이블로 폴백한다.
 * 결과는 limit개로 제한된다.
 */
export function selectRelevantTables(doc: DiagramDocument, query: string, limit = 12): string[] {
  const entities = doc.entities ?? [];
  if (entities.length === 0) return [];

  const queryTokens = new Set(tokenize(query));
  const scored = entities.map((e) => {
    const nameTokens = new Set([...tokenize(e.name), ...tokenize(e.logicalName ?? "")]);
    const colTokens = new Set(e.columns.flatMap((c) => tokenize(c.name)));
    let score = 0;
    for (const t of queryTokens) {
      if (nameTokens.has(t)) score += 5; // 테이블 이름 일치 가중치 높음
      if (colTokens.has(t)) score += 1;
    }
    // 테이블 이름 전체가 질의에 등장하면(예: "orders") 부분 일치보다 우선시한다.
    if (nameTokens.size > 0 && [...nameTokens].every((t) => queryTokens.has(t))) score += 10;
    return { id: e.id, score };
  });

  const matched = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);

  const selected: string[] = [];
  const seen = new Set<string>();
  const push = (id: string) => {
    if (!seen.has(id) && selected.length < limit) {
      seen.add(id);
      selected.push(id);
    }
  };

  if (matched.length > 0) {
    for (const m of matched) push(m.id);
    // 1-hop FK 이웃으로 부분 그래프 완결
    const neighborIds = neighborsOf(doc, new Set(selected));
    for (const id of neighborIds) push(id);
  } else {
    // 폴백: 관계 차수가 높은 중심 테이블
    const degree = degreeMap(doc);
    const central = [...entities]
      .sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0));
    for (const e of central) push(e.id);
  }

  return selected;
}

function tokenize(text: string): string[] {
  if (!text) return [];
  // snake_case 분해 + camelCase 경계 분해 후 소문자 영숫자 토큰만 추출
  const spaced = text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_\-./]+/g, " ")
    .toLowerCase();
  const tokens = spaced.match(/[a-z0-9]+/g) ?? [];
  // 단수/복수 단순 정규화 (users ~ user)
  return tokens.map((t) => (t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t));
}

function neighborsOf(doc: DiagramDocument, ids: Set<string>): string[] {
  const result: string[] = [];
  for (const r of doc.relationships ?? []) {
    if (ids.has(r.sourceEntityId) && !ids.has(r.targetEntityId)) result.push(r.targetEntityId);
    if (ids.has(r.targetEntityId) && !ids.has(r.sourceEntityId)) result.push(r.sourceEntityId);
  }
  return result;
}

function degreeMap(doc: DiagramDocument): Map<string, number> {
  const degree = new Map<string, number>();
  for (const r of doc.relationships ?? []) {
    degree.set(r.sourceEntityId, (degree.get(r.sourceEntityId) ?? 0) + 1);
    degree.set(r.targetEntityId, (degree.get(r.targetEntityId) ?? 0) + 1);
  }
  return degree;
}
