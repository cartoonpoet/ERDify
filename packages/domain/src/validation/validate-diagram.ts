import type { DiagramDocument, DiagramValidationResult } from "../types/index.js";

export function validateDiagram(diagram: DiagramDocument): DiagramValidationResult {
  const errors: string[] = [];
  const entityIds = new Set(diagram.entities.map((entity) => entity.id));

  if (diagram.format !== "erdify.schema.v1") {
    errors.push("Diagram format must be erdify.schema.v1.");
  }

  for (const relationship of diagram.relationships) {
    if (!entityIds.has(relationship.sourceEntityId)) {
      errors.push(
        `Relationship ${relationship.id} references missing source entity ${relationship.sourceEntityId}.`
      );
    }

    if (!entityIds.has(relationship.targetEntityId)) {
      errors.push(
        `Relationship ${relationship.id} references missing target entity ${relationship.targetEntityId}.`
      );
    }
  }

  const objects = diagram.objects ?? [];
  const seenNames = new Set<string>();
  for (const obj of objects) {
    if (obj.sql.trim().length === 0) {
      errors.push(`Object "${obj.name}" (${obj.kind}) has empty SQL.`);
    }
    if (seenNames.has(obj.name)) {
      errors.push(`Duplicate object name "${obj.name}".`);
    }
    seenNames.add(obj.name);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
