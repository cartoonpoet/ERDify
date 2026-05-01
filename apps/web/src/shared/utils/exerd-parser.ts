import type { DiagramDocument, DiagramEntity, DiagramColumn, DiagramRelationship } from "@erdify/domain";

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function attr(el: Element, ...names: string[]): string {
  for (const name of names) {
    const val = el.getAttribute(name);
    if (val !== null) return val;
  }
  return "";
}

function parseColumn(el: Element, ordinal: number): DiagramColumn {
  const pk = attr(el, "pk").toLowerCase() === "true";
  const notNull = attr(el, "notNull").toLowerCase() === "true";
  const unique = attr(el, "unique").toLowerCase() === "true";
  const defaultValue = el.getAttribute("defaultValue") ?? null;

  return {
    id: uuid(),
    name: attr(el, "physicalName", "name"),
    type: attr(el, "type"),
    nullable: !notNull && !pk,
    primaryKey: pk,
    unique,
    defaultValue,
    comment: el.getAttribute("comment") ?? null,
    ordinal,
  };
}

function parseTable(el: Element): { entity: DiagramEntity; x: number | null; y: number | null } {
  const name = attr(el, "physicalName", "name");
  const logicalName = el.getAttribute("logicalName") || null;
  const comment = el.getAttribute("comment") || null;

  const xAttr = el.getAttribute("x");
  const yAttr = el.getAttribute("y");
  const x = xAttr !== null ? parseFloat(xAttr) : null;
  const y = yAttr !== null ? parseFloat(yAttr) : null;

  const columnEls = Array.from(el.querySelectorAll("column"));
  const columns: DiagramColumn[] = columnEls.map((c, i) => parseColumn(c, i));

  return {
    entity: { id: uuid(), name, logicalName, comment, color: null, columns },
    x,
    y,
  };
}

export function parseExerd(
  xmlText: string,
): Omit<DiagramDocument, "format" | "id" | "name" | "dialect" | "metadata"> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");

  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error(`ExERD XML parse error: ${parseError.textContent}`);
  }

  const tableEls = Array.from(doc.querySelectorAll("table"));

  const tableInfos = tableEls.map((el) => parseTable(el));
  const entities = tableInfos.map((t) => t.entity);

  const entityByName = new Map<string, DiagramEntity>();
  for (const e of entities) {
    entityByName.set(e.name, e);
  }

  const entityPositions: Record<string, { x: number; y: number }> = {};
  tableInfos.forEach((info, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    entityPositions[info.entity.id] = {
      x: info.x !== null ? info.x : col * 280,
      y: info.y !== null ? info.y : row * 320,
    };
  });

  const relationshipEls = Array.from(doc.querySelectorAll("relationship"));
  const relationships: DiagramRelationship[] = [];

  for (const relEl of relationshipEls) {
    const srcTableEl = relEl.querySelector("sourceTable");
    const tgtTableEl = relEl.querySelector("targetTable");
    if (!srcTableEl || !tgtTableEl) continue;

    const srcTableName = attr(srcTableEl, "physicalName", "name");
    const tgtTableName = attr(tgtTableEl, "physicalName", "name");

    const srcEntity = entityByName.get(srcTableName);
    const tgtEntity = entityByName.get(tgtTableName);
    if (!srcEntity || !tgtEntity) continue;

    const srcColIds: string[] = [];
    const tgtColIds: string[] = [];

    const colEls = Array.from(relEl.querySelectorAll("column"));
    for (const colEl of colEls) {
      const fkColName = attr(colEl, "foreignKeyColumn");
      const pkColName = attr(colEl, "primaryKeyColumn");

      const srcCol = srcEntity.columns.find((c) => c.name === fkColName);
      const tgtCol = tgtEntity.columns.find((c) => c.name === pkColName);

      if (srcCol) srcColIds.push(srcCol.id);
      if (tgtCol) tgtColIds.push(tgtCol.id);
    }

    const relName = attr(relEl, "name", "physicalName");

    relationships.push({
      id: uuid(),
      name: relName || `fk_${srcTableName}_${tgtTableName}`,
      sourceEntityId: srcEntity.id,
      sourceColumnIds: srcColIds,
      targetEntityId: tgtEntity.id,
      targetColumnIds: tgtColIds,
      cardinality: "many-to-one",
      onDelete: "no-action",
      onUpdate: "no-action",
      identifying: false,
    });
  }

  return {
    entities,
    relationships,
    indexes: [],
    views: [],
    layout: { entityPositions },
  };
}
