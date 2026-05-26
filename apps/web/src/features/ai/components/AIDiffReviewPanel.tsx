import type { DiffChange } from "@erdify/contracts";
import type { DiagramDocument } from "@erdify/domain";
import * as css from "./AIDiffReviewPanel.css";

interface ColumnReview {
  id: string;
  name: string;
  type: string;
  isPk: boolean;
  changeType: "added" | "removed" | "modified" | "unchanged";
}

interface TableReview {
  tableId: string;
  tableName: string;
  changeType: "added" | "removed" | "modified";
  columns: ColumnReview[];
}

interface RelationReview {
  relationId: string;
  fromTable: string;
  toTable: string;
  cardinality: string;
  changeType: "added" | "removed";
}

const buildReview = (
  diff: DiffChange[],
  currentDoc: DiagramDocument | null,
  pendingDoc: DiagramDocument,
): { tables: TableReview[]; relations: RelationReview[] } => {
  const tableMap = new Map<string, TableReview>();

  const getTableReview = (tableId: string, tableName: string, changeType: TableReview["changeType"]): TableReview => {
    if (!tableMap.has(tableId)) {
      tableMap.set(tableId, { tableId, tableName, changeType, columns: [] });
    }
    return tableMap.get(tableId)!;
  };

  for (const change of diff) {
    switch (change.type) {
      case "addTable": {
        const entity = pendingDoc.entities.find((e) => e.id === change.tableId);
        const review = getTableReview(change.tableId, change.tableName, "added");
        review.columns = (entity?.columns ?? []).map((c) => ({
          id: c.id, name: c.name, type: c.type, isPk: c.primaryKey, changeType: "added",
        }));
        break;
      }
      case "removeTable": {
        const entity = currentDoc?.entities.find((e) => e.id === change.tableId);
        const review = getTableReview(change.tableId, change.tableName, "removed");
        review.columns = (entity?.columns ?? []).map((c) => ({
          id: c.id, name: c.name, type: c.type, isPk: c.primaryKey, changeType: "removed",
        }));
        break;
      }
      case "addColumn": {
        const review = getTableReview(change.tableId, change.tableName, "modified");
        if (!review.columns.some((c) => c.id === change.columnId)) {
          review.columns.push({ id: change.columnId, name: change.columnName, type: change.columnType, isPk: false, changeType: "added" });
        }
        break;
      }
      case "removeColumn": {
        const review = getTableReview(change.tableId, change.tableName, "modified");
        if (!review.columns.some((c) => c.id === change.columnId)) {
          review.columns.push({ id: change.columnId, name: change.columnName, type: "", isPk: false, changeType: "removed" });
        }
        break;
      }
      case "updateColumn": {
        const review = getTableReview(change.tableId, change.tableName, "modified");
        const entity = pendingDoc.entities.find((e) => e.id === change.tableId);
        const col = entity?.columns.find((c) => c.id === change.columnId);
        if (col && !review.columns.some((c) => c.id === change.columnId)) {
          review.columns.push({ id: col.id, name: col.name, type: col.type, isPk: col.primaryKey, changeType: "modified" });
        }
        break;
      }
    }
  }

  // modified 테이블은 변경되지 않은 컬럼도 함께 표시
  for (const review of tableMap.values()) {
    if (review.changeType !== "modified") continue;
    const entity = pendingDoc.entities.find((e) => e.id === review.tableId);
    if (!entity) continue;
    for (const col of entity.columns) {
      if (!review.columns.some((c) => c.id === col.id)) {
        review.columns.push({ id: col.id, name: col.name, type: col.type, isPk: col.primaryKey, changeType: "unchanged" });
      }
    }
    // 정렬: PK 먼저, 변경된 것 위로
    review.columns.sort((a, b) => {
      if (a.isPk !== b.isPk) return a.isPk ? -1 : 1;
      const order = { added: 0, removed: 1, modified: 2, unchanged: 3 };
      return order[a.changeType] - order[b.changeType];
    });
  }

  const relations: RelationReview[] = diff
    .filter((c): c is Extract<DiffChange, { type: "addRelation" | "removeRelation" }> =>
      c.type === "addRelation" || c.type === "removeRelation"
    )
    .map((c) =>
      c.type === "addRelation"
        ? { relationId: c.relationId, fromTable: c.fromTable, toTable: c.toTable, cardinality: c.cardinality, changeType: "added" as const }
        : { relationId: c.relationId, fromTable: c.fromTable, toTable: c.toTable, cardinality: "", changeType: "removed" as const }
    );

  return { tables: Array.from(tableMap.values()), relations };
};

const CHANGE_LABEL: Record<TableReview["changeType"], string> = {
  added: "추가됨",
  removed: "삭제됨",
  modified: "수정됨",
};

const COLUMN_MARKER: Record<ColumnReview["changeType"], string> = {
  added: "+",
  removed: "-",
  modified: "~",
  unchanged: " ",
};

const tableHeaderClass = (changeType: TableReview["changeType"]) => {
  if (changeType === "added") return `${css.tableHeader} ${css.tableHeaderAdded}`;
  if (changeType === "removed") return `${css.tableHeader} ${css.tableHeaderRemoved}`;
  return `${css.tableHeader} ${css.tableHeaderModified}`;
};

const tableCardClass = (changeType: TableReview["changeType"]) => {
  if (changeType === "added") return `${css.tableCard} ${css.tableCardAdded}`;
  if (changeType === "removed") return `${css.tableCard} ${css.tableCardRemoved}`;
  return `${css.tableCard} ${css.tableCardModified}`;
};

const columnRowClass = (changeType: ColumnReview["changeType"]) => {
  if (changeType === "added") return `${css.columnRow} ${css.columnRowAdded}`;
  if (changeType === "removed") return `${css.columnRow} ${css.columnRowRemoved}`;
  if (changeType === "modified") return `${css.columnRow} ${css.columnRowModified}`;
  return css.columnRow;
};

interface AIDiffReviewPanelProps {
  diff: DiffChange[];
  pendingDocument: DiagramDocument;
  currentDocument: DiagramDocument | null;
  onAccept: () => void;
  onReject: () => void;
}

export const AIDiffReviewPanel = ({ diff, pendingDocument, currentDocument, onAccept, onReject }: AIDiffReviewPanelProps) => {
  const { tables, relations } = buildReview(diff, currentDocument, pendingDocument);

  return (
    <div className={css.overlay} onClick={(e) => { if (e.target === e.currentTarget) onReject(); }}>
      <div className={css.panel}>
        <div className={css.header}>
          <span className={css.headerTitle}>AI 제안 검토</span>
          <span className={css.headerBadge}>{diff.length}개 변경사항</span>
          <button type="button" className={css.rejectBtn} onClick={onReject}>거절</button>
          <button type="button" className={css.acceptBtn} onClick={onAccept}>수락</button>
        </div>

        <div className={css.body}>
          {tables.length > 0 && (
            <div>
              <div className={css.sectionTitle}>테이블</div>
              <div className={css.tablesGrid}>
                {tables.map((table) => (
                  <div key={table.tableId} className={tableCardClass(table.changeType)}>
                    <div className={tableHeaderClass(table.changeType)}>
                      <span className={css.tableName}>{table.tableName}</span>
                      <span className={css.tableChangeBadge}>{CHANGE_LABEL[table.changeType]}</span>
                    </div>
                    <div className={css.columnList}>
                      {table.columns.map((col) => (
                        <div key={col.id} className={columnRowClass(col.changeType)}>
                          <span className={css.columnChangeMarker}>{COLUMN_MARKER[col.changeType]}</span>
                          {col.isPk && <span className={css.pkBadge}>PK</span>}
                          <span className={css.columnName}>{col.name}</span>
                          {col.type && <span className={css.columnType}>{col.type}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {relations.length > 0 && (
            <div>
              <div className={css.sectionTitle}>관계</div>
              <div className={css.relationsSection}>
                {relations.map((rel) => (
                  <div
                    key={rel.relationId}
                    className={rel.changeType === "added" ? `${css.relationRow} ${css.relationRowAdded}` : `${css.relationRow} ${css.relationRowRemoved}`}
                  >
                    <span>{rel.changeType === "added" ? "+" : "-"}</span>
                    <span>{rel.fromTable} → {rel.toTable}</span>
                    {rel.cardinality && <span style={{ opacity: 0.7, fontSize: "11px" }}>({rel.cardinality})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
