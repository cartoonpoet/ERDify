import type { DiagramDocument } from "../types/index.js";

/**
 * 다이어그램 요약 텍스트 (CLI/MCP 공용).
 * 엔티티는 id→name 맵으로 한 번만 인덱싱해 관계 표시를 O(R+N)으로 처리한다.
 */
export function formatDiagram(name: string, doc: DiagramDocument): string {
  const nameById = new Map(doc.entities.map((e) => [e.id, e.name]));
  const lines: string[] = [`Diagram: "${name}" (${doc.dialect})`, ""];
  lines.push(`Tables (${doc.entities.length}):`);
  for (const entity of doc.entities) {
    lines.push(`  ${entity.name} [tableId: ${entity.id}]`);
    for (const col of [...entity.columns].sort((a, b) => a.ordinal - b.ordinal)) {
      const flags = [
        col.primaryKey ? "PK" : null,
        !col.nullable ? "NOT NULL" : null,
        col.unique ? "UNIQUE" : null,
      ]
        .filter(Boolean)
        .join(" ");
      lines.push(`    - ${col.name} [columnId: ${col.id}]: ${col.type}${flags ? " " + flags : ""}`);
    }
  }
  if (doc.relationships.length > 0) {
    lines.push("", `Relationships (${doc.relationships.length}):`);
    for (const rel of doc.relationships) {
      const src = nameById.get(rel.sourceEntityId) ?? rel.sourceEntityId;
      const tgt = nameById.get(rel.targetEntityId) ?? rel.targetEntityId;
      lines.push(`  ${src} → ${tgt} (${rel.cardinality}) [relationshipId: ${rel.id}]`);
    }
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
