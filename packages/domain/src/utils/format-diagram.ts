import type { DiagramColumn, DiagramDocument, DiagramEntity, DiagramIndex } from "../types/index.js";

export interface FormatDiagramOptions {
  /**
   * true면 컬럼의 DEFAULT·ON UPDATE·AUTO_INCREMENT·주석과 테이블 인덱스까지 출력한다.
   * 대형 다이어그램의 전체 요약이 과하게 길어지지 않도록 기본값은 false다.
   */
  detail?: boolean;
}

/**
 * 스키마가 있으면 `Schema.Table`로 표기한다.
 * MCP/CLI 응답만 보고도 테이블이 어느 스키마에 속하는지 알 수 있어야 한다.
 */
export function qualifiedEntityName(entity: Pick<DiagramEntity, "name"> & { schema?: string | null }): string {
  return entity.schema ? `${entity.schema}.${entity.name}` : entity.name;
}

/** 요약은 한 줄 단위라 주석의 개행이 새면 구조가 깨진다. 공백으로 정규화한다. */
function oneLine(value: string): string {
  return value.replaceAll(/\s+/g, " ").trim();
}

/** 한 컬럼을 한 줄로 요약한다. detail이면 DEFAULT·ON UPDATE·AUTO_INCREMENT·주석까지 붙는다. */
export function formatColumn(col: DiagramColumn, options: FormatDiagramOptions = {}): string {
  const parts = [
    col.primaryKey ? "PK" : null,
    col.nullable ? null : "NOT NULL",
    col.unique ? "UNIQUE" : null,
  ];
  if (options.detail) {
    const defaultValue = col.defaultValue?.trim();
    parts.push(
      defaultValue ? `DEFAULT ${defaultValue}` : null,
      col.onUpdate?.trim() ? `ON UPDATE ${col.onUpdate.trim()}` : null,
      col.autoIncrement ? "AUTO_INCREMENT" : null,
    );
  }
  const flags = parts.filter(Boolean).join(" ");
  const comment = options.detail && col.comment ? ` -- ${oneLine(col.comment)}` : "";
  return `${col.name} [columnId: ${col.id}]: ${col.type}${flags ? " " + flags : ""}${comment}`;
}

/** 한 인덱스를 한 줄로 요약한다. 컬럼 id는 소속 테이블의 컬럼명으로 풀어 쓴다. */
export function formatIndex(index: DiagramIndex, entity: DiagramEntity): string {
  const nameById = new Map(entity.columns.map((c) => [c.id, c.name]));
  // 삭제된 컬럼을 가리키는 id는 조용히 감추지 않고 id 그대로 드러낸다(정합성 문제를 보이게).
  const cols = index.columnIds.map((id) => nameById.get(id) ?? `<${id}>`).join(", ");
  return `${index.name} (${cols})${index.unique ? " UNIQUE" : ""} [indexId: ${index.id}]`;
}

/**
 * 테이블 하나를 여러 줄로 요약한다(헤더 + 컬럼 + detail이면 인덱스).
 * get_diagram과 get_table이 같은 표현을 쓰도록 공유한다.
 */
export function formatEntityLines(
  doc: DiagramDocument,
  entity: DiagramEntity,
  options: FormatDiagramOptions = {},
  indent = "",
): string[] {
  const comment = options.detail && entity.comment ? ` -- ${oneLine(entity.comment)}` : "";
  const lines = [`${indent}${qualifiedEntityName(entity)} [tableId: ${entity.id}]${comment}`];
  for (const col of [...entity.columns].sort((a, b) => a.ordinal - b.ordinal)) {
    lines.push(`${indent}  - ${formatColumn(col, options)}`);
  }
  if (options.detail) {
    const indexes = doc.indexes.filter((idx) => idx.entityId === entity.id);
    for (const idx of indexes) {
      lines.push(`${indent}  * ${formatIndex(idx, entity)}`);
    }
  }
  return lines;
}

/**
 * 다이어그램 요약 텍스트 (CLI/MCP 공용).
 * 엔티티는 id→name 맵으로 한 번만 인덱싱해 관계 표시를 O(R+N)으로 처리한다.
 */
export function formatDiagram(
  name: string,
  doc: DiagramDocument,
  options: FormatDiagramOptions = {},
): string {
  const nameById = new Map(doc.entities.map((e) => [e.id, qualifiedEntityName(e)]));
  const lines: string[] = [`Diagram: "${name}" (${doc.dialect})`, ""];
  lines.push(`Tables (${doc.entities.length}):`);
  for (const entity of doc.entities) {
    lines.push(...formatEntityLines(doc, entity, options, "  "));
  }
  if (doc.relationships.length > 0) {
    lines.push("", `Relationships (${doc.relationships.length}):`);
    for (const rel of doc.relationships) {
      const src = nameById.get(rel.sourceEntityId) ?? rel.sourceEntityId;
      const tgt = nameById.get(rel.targetEntityId) ?? rel.targetEntityId;
      lines.push(`  ${src} → ${tgt} (${rel.cardinality}) [relationshipId: ${rel.id}]`);
    }
  }
  // 인덱스는 detail일 때 각 테이블 아래에 붙는다. 요약 모드에서도 존재 여부는 알려야
  // "인덱스가 없다"고 오해하지 않는다.
  if (!options.detail && doc.indexes.length > 0) {
    lines.push("", `Indexes (${doc.indexes.length}): not listed in summary mode.`);
  }
  const objects = doc.objects ?? [];
  if (objects.length > 0) {
    lines.push("", `Objects (${objects.length}):`);
    for (const obj of objects) {
      lines.push(`  ${obj.kind} ${obj.name} [objectId: ${obj.id}]`);
    }
  }
  return lines.join("\n");
}
