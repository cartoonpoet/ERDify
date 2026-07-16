import type { DiagramDocument } from "../types/index.js";

/**
 * 코드로 계산한 결정적 스키마 사실(fact). AI는 이를 분석/제안의 근거로 사용하고,
 * 이 목록을 넘어서는 문제를 "지어내지" 않는다(무할루시네이션).
 */
export interface SchemaFinding {
  kind:
    | "missing_pk"
    | "nullable_pk"
    | "fk_without_index"
    | "type_mismatch"
    | "naming_inconsistency"
    | "repeating_group";
  /** 사람이 읽을 수 있는, 실제 이름만 사용한 설명(한국어). */
  detail: string;
  /** 관련 테이블 이름(있으면). */
  table?: string;
}

const MAX_FINDINGS = 40;

/**
 * 컬럼명 끝의 "(선택적 `_`) + 숫자" 접미사를 떼어 base 이름을 구한다(addr1→addr, phone_2→phone).
 * 예전에는 `/^(.*?)_?(\d+)$/` 하나로 처리했지만, 앵커 없는 `.*?` 뒤에 `$`로 고정된 `\d+`가 오는
 * 조합은 끝에 숫자가 없는 긴 문자열에서 O(n²) 백트래킹을 유발한다(각 시도 지점마다 `\d+`가
 * 최대로 먹었다가 되돌리는 동작이 반복됨). 끝에서부터 숫자를 직접 스캔하면 동일한 결과를
 * O(n)에 얻을 수 있다.
 */
function stripTrailingNumberSuffix(name: string): string | null {
  let i = name.length;
  while (i > 0 && name.charCodeAt(i - 1) >= 48 && name.charCodeAt(i - 1) <= 57) i--;
  if (i === name.length) return null; // 끝에 숫자가 없음
  let base = name.slice(0, i);
  if (base.endsWith("_")) base = base.slice(0, -1);
  return base;
}

/** snake/camel을 모호하지 않게 구분한다. 한 단어 소문자(id, email)는 어느 쪽도 아니다. */
function caseStyle(name: string): "snake" | "camel" | "ambiguous" {
  const hasUpper = /[A-Z]/.test(name);
  const hasUnderscore = name.includes("_");
  if (hasUnderscore && !hasUpper) return "snake";
  if (hasUpper && !hasUnderscore) return "camel";
  return "ambiguous";
}

/**
 * 다이어그램에서 결정적으로 계산 가능한 스키마 이슈를 추출한다.
 * 순수 함수 — 입력 문서를 변경하지 않으며 동일 입력에 항상 동일 출력.
 */
export function analyzeSchema(doc: DiagramDocument): SchemaFinding[] {
  const findings: SchemaFinding[] = [];
  const entities = doc.entities ?? [];
  const relationships = doc.relationships ?? [];
  const indexes = doc.indexes ?? [];

  // 1) PK 누락 / nullable PK
  for (const entity of entities) {
    const pks = entity.columns.filter((c) => c.primaryKey);
    if (pks.length === 0) {
      findings.push({ kind: "missing_pk", table: entity.name, detail: `테이블 "${entity.name}"에 기본키(PK)가 없습니다.` });
    }
    for (const pk of pks) {
      if (pk.nullable) {
        findings.push({ kind: "nullable_pk", table: entity.name, detail: `"${entity.name}.${pk.name}"는 PK인데 nullable=true 입니다.` });
      }
    }
  }

  // 2) 인덱스 없는 FK 컬럼
  const indexedColumnIds = new Set<string>();
  for (const idx of indexes) for (const cid of idx.columnIds) indexedColumnIds.add(cid);
  for (const rel of relationships) {
    const src = entities.find((e) => e.id === rel.sourceEntityId);
    if (!src) continue;
    for (const colId of rel.sourceColumnIds) {
      if (indexedColumnIds.has(colId)) continue;
      const col = src.columns.find((c) => c.id === colId);
      if (!col) continue;
      findings.push({ kind: "fk_without_index", table: src.name, detail: `FK "${src.name}.${col.name}"에 인덱스가 없습니다.` });
    }
  }

  // 3) 같은 컬럼명, 다른 타입 (FK 타입 불일치 후보)
  const nameToTypes = new Map<string, Set<string>>();
  for (const entity of entities) {
    for (const col of entity.columns) {
      const set = nameToTypes.get(col.name) ?? new Set<string>();
      set.add(col.type);
      nameToTypes.set(col.name, set);
    }
  }
  for (const [name, types] of nameToTypes) {
    if (types.size > 1) {
      findings.push({ kind: "type_mismatch", detail: `컬럼명 "${name}"이 테이블마다 다른 타입(${[...types].join(", ")})으로 정의되어 있습니다.` });
    }
  }

  // 4) 네이밍 케이스 혼용 (snake vs camel)
  const styles = entities.flatMap((e) => e.columns.map((c) => ({ name: `${e.name}.${c.name}`, style: caseStyle(c.name) })));
  const snake = styles.filter((s) => s.style === "snake").length;
  const camel = styles.filter((s) => s.style === "camel").length;
  if (snake > 0 && camel > 0) {
    const minority = camel <= snake ? "camel" : "snake";
    const examples = styles.filter((s) => s.style === minority).map((s) => s.name).slice(0, 8);
    findings.push({
      kind: "naming_inconsistency",
      detail: `컬럼 네이밍 케이스가 혼용되어 있습니다(snake ${snake}개 / camel ${camel}개). 소수 스타일(${minority}) 예: ${examples.join(", ")}`,
    });
  }

  // 5) 반복 컬럼군 (addr1, addr2 / phone_1, phone_2 → 정규화 후보)
  for (const entity of entities) {
    const groups = new Map<string, number>();
    for (const col of entity.columns) {
      const base = stripTrailingNumberSuffix(col.name);
      if (base) groups.set(base, (groups.get(base) ?? 0) + 1);
    }
    for (const [base, count] of groups) {
      if (count >= 2) {
        findings.push({ kind: "repeating_group", table: entity.name, detail: `"${entity.name}"에 반복 컬럼군(${base}… ×${count})이 있습니다 — 별도 테이블로 정규화 후보입니다.` });
      }
    }
  }

  return findings.slice(0, MAX_FINDINGS);
}
