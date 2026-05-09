import type { DiagramDocument } from "@erdify/domain";

type MeasuredSizes = Map<string, { w: number; h: number }>;

function layoutComponents(
  components: string[][],
  inDegree: Map<string, number>,
  doc: DiagramDocument,
  measuredSizes: MeasuredSizes,
  originX: number,
  originY: number,
  NODE_W: number,
  H_GAP: number,
  V_GAP: number,
  COMP_H_GAP: number,
): { positions: Record<string, { x: number; y: number }>; groupW: number; groupH: number } {
  const estimateH = (id: string, colCount: number) =>
    (measuredSizes.get(id)?.h ?? (38 + 28 + colCount * 30)) + V_GAP;
  const estimateW = (id: string) => (measuredSizes.get(id)?.w ?? NODE_W) + H_GAP;

  const NODE_H_FALLBACK = 120;
  const sorted = [...components].sort((a, b) => b.length - a.length);
  const COMPS_PER_ROW = Math.max(1, Math.ceil(Math.sqrt(sorted.length)));
  const positions: Record<string, { x: number; y: number }> = {};

  let compX = originX;
  let compY = originY;
  let rowMaxH = 0;
  let compCol = 0;

  for (const comp of sorted) {
    const sortedComp = [...comp].sort((a, b) => (inDegree.get(b) ?? 0) - (inDegree.get(a) ?? 0));
    const nCols = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(sortedComp.length))));
    const colWidths = Array<number>(nCols).fill(0);
    const colHeights = Array<number>(nCols).fill(0);

    for (const id of sortedComp) {
      const entity = doc.entities.find((e) => e.id === id)!;
      const col = colHeights.indexOf(Math.min(...colHeights));
      const xOff = colWidths.slice(0, col).reduce((s, w) => s + w, 0);
      positions[id] = { x: compX + xOff, y: compY + colHeights[col]! };
      colHeights[col] = colHeights[col]! + estimateH(id, entity.columns.length);
      colWidths[col] = Math.max(colWidths[col]!, estimateW(id));
    }

    const compW = colWidths.reduce((s, w) => s + w, 0);
    const compH = Math.max(...colHeights);
    rowMaxH = Math.max(rowMaxH, compH);

    compCol++;
    if (compCol >= COMPS_PER_ROW) {
      compX = originX;
      compY += rowMaxH + COMP_H_GAP;
      rowMaxH = 0;
      compCol = 0;
    } else {
      compX += compW + COMP_H_GAP;
    }
  }

  const allX = Object.values(positions).map((p) => p.x);
  const allY = Object.values(positions).map((p) => p.y);
  const groupW = allX.length ? Math.max(...allX) - originX + NODE_W + H_GAP : 0;
  const groupH = allY.length ? Math.max(...allY) - originY + NODE_H_FALLBACK + V_GAP : 0;

  return { positions, groupW, groupH };
}

function bfsComponents(entityIds: string[], adj: Map<string, Set<string>>): string[][] {
  const visited = new Set<string>();
  return entityIds.reduce<string[][]>((acc, id) => {
    if (visited.has(id)) return acc;
    const comp: string[] = [];
    const queue = [id];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (visited.has(curr)) continue;
      visited.add(curr);
      comp.push(curr);
      for (const nbr of adj.get(curr) ?? []) {
        if (!visited.has(nbr)) queue.push(nbr);
      }
    }
    return [...acc, comp];
  }, []);
}

export function computeAutoLayout(doc: DiagramDocument, measuredSizes: MeasuredSizes): Record<string, { x: number; y: number }> {
  const NODE_W = 280;
  const H_GAP = 96;
  const V_GAP = 80;
  const SCHEMA_H_GAP = 140;
  const SCHEMA_V_GAP = 100;
  const SCHEMA_PAD = 40;
  const COMP_H_GAP = 80;

  const schemaGroups = doc.entities.reduce<Map<string, string[]>>((acc, e) => {
    const key = e.schema ?? "__none__";
    return acc.set(key, [...(acc.get(key) ?? []), e.id]);
  }, new Map());

  const schemaKeys = [...schemaGroups.keys()].sort((a, b) =>
    a === "__none__" ? 1 : b === "__none__" ? -1 : a.localeCompare(b)
  );

  const inDegree = doc.relationships.reduce<Map<string, number>>(
    (acc, r) => acc.set(r.targetEntityId, (acc.get(r.targetEntityId) ?? 0) + 1),
    new Map(doc.entities.map((e) => [e.id, 0]))
  );

  const SCHEMAS_PER_ROW = Math.max(1, Math.ceil(Math.sqrt(schemaKeys.length)));
  const positions: Record<string, { x: number; y: number }> = {};

  let schemaX = 0;
  let schemaY = 0;
  let rowMaxH = 0;
  let schemaCol = 0;

  for (const key of schemaKeys) {
    const entityIds = schemaGroups.get(key) ?? [];

    const groupSet = new Set(entityIds);
    const adj = entityIds.reduce<Map<string, Set<string>>>((m, id) => m.set(id, new Set()), new Map());
    for (const r of doc.relationships) {
      if (groupSet.has(r.sourceEntityId) && groupSet.has(r.targetEntityId)) {
        adj.get(r.sourceEntityId)?.add(r.targetEntityId);
        adj.get(r.targetEntityId)?.add(r.sourceEntityId);
      }
    }

    const components = bfsComponents(entityIds, adj);
    const { positions: compPositions, groupW, groupH } = layoutComponents(
      components, inDegree, doc, measuredSizes,
      schemaX + SCHEMA_PAD, schemaY + SCHEMA_PAD,
      NODE_W, H_GAP, V_GAP, COMP_H_GAP,
    );

    Object.assign(positions, compPositions);

    const totalH = groupH + SCHEMA_PAD * 2;
    const totalW = groupW + SCHEMA_PAD * 2;
    rowMaxH = Math.max(rowMaxH, totalH);

    schemaCol++;
    if (schemaCol >= SCHEMAS_PER_ROW) {
      schemaX = 0;
      schemaY += rowMaxH + SCHEMA_V_GAP;
      rowMaxH = 0;
      schemaCol = 0;
    } else {
      schemaX += totalW + SCHEMA_H_GAP;
    }
  }

  return positions;
}
