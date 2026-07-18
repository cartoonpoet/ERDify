import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { DiagramDocument, DiagramColumn, DiagramIndex, DiagramRelationship, RelationshipCardinality } from "@erdify/domain";
import type { DiffChange } from "@erdify/contracts";
import { DomainLoaderService } from "../../../common/services/domain-loader.service";

export interface ToolResult {
  doc: DiagramDocument;
  changes: DiffChange[];
  resultText: string;
}

/** 명시적 실패 메시지: AI가 다음 turn에서 스스로 교정하도록 유효 id 조회 경로를 안내한다. */
const tableNotFound = (doc: DiagramDocument, tableId: string): ToolResult => ({
  doc,
  changes: [],
  resultText: `Error: no table found with id "${tableId}". Call listTables to get the valid table ids, then retry. Do not invent ids.`,
});
const columnNotFound = (doc: DiagramDocument, entityName: string, tableId: string, colId: string): ToolResult => ({
  doc,
  changes: [],
  resultText: `Error: table "${entityName}" (id ${tableId}) has no column with id "${colId}". Call getTableDetails("${tableId}") to get the valid column ids, then retry. Do not invent ids.`,
});
/** 웹 에디터(EditorCanvas)의 FK 이름 파생과 동일한 snake_case 변환. */
const toSnake = (s: string): string =>
  s.replace(/\s+/g, "_").replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
/** 변경이 적용된 문서를 사람이 읽을 수 있는 요약과 함께 ToolResult로 포장한다. */
const applied = (doc: DiagramDocument, changes: DiffChange[]): ToolResult => ({
  doc,
  changes,
  resultText: `Applied: ${changes.map(describeChange).join("; ")}`,
});

/**
 * 엔티티 논리명(logicalName) 불변 갱신. packages/domain에는 엔티티 logicalName을 바꾸는
 * 커맨드가 없어(renameEntity/updateEntityComment만 존재) 여기서 동일한 불변 패턴으로 처리한다.
 */
const setEntityLogicalName = (doc: DiagramDocument, entityId: string, logicalName: string): DiagramDocument => ({
  ...doc,
  entities: doc.entities.map((e) => (e.id === entityId ? { ...e, logicalName } : e)),
});

type DomainModule = Awaited<ReturnType<DomainLoaderService["load"]>>;

interface AddTableColumnInput {
  name: string;
  type: string;
  nullable?: boolean;
  primaryKey?: boolean;
  unique?: boolean;
  comment?: string;
}

@Injectable()
export class ToolExecutor {
  constructor(private readonly domainLoader: DomainLoaderService) {}

  async execute(toolName: string, input: Record<string, unknown>, doc: DiagramDocument): Promise<ToolResult> {
    if (toolName === "listTables") {
      const tables = doc.entities.map((e) => ({ id: e.id, name: e.name, columnCount: e.columns.length }));
      return { doc, changes: [], resultText: JSON.stringify(tables) };
    }
    if (toolName === "getTableDetails") {
      const tableId = input["tableId"] as string;
      const entity = doc.entities.find((x) => x.id === tableId);
      if (!entity) return { doc, changes: [], resultText: `Table ${tableId} not found.` };
      const relationships = doc.relationships.filter((r) => r.sourceEntityId === tableId || r.targetEntityId === tableId);
      const indexes = doc.indexes.filter((i) => i.entityId === tableId);
      return { doc, changes: [], resultText: JSON.stringify({ id: entity.id, name: entity.name, columns: entity.columns, indexes, relationships }) };
    }
    return this.executeMutation(toolName, input, doc);
  }

  private async executeMutation(toolName: string, input: Record<string, unknown>, doc: DiagramDocument): Promise<ToolResult> {
    const domain = await this.domainLoader.load();

    switch (toolName) {
      case "addTable": return this.addTable(input, doc, domain);
      case "removeTable": return this.removeTable(input, doc, domain);
      case "updateTable": return this.updateTable(input, doc, domain);
      case "addColumn": return this.addColumn(input, doc, domain);
      case "removeColumn": return this.removeColumn(input, doc, domain);
      case "updateColumn": return this.updateColumn(input, doc, domain);
      case "addRelation": return this.addRelation(input, doc, domain);
      case "removeRelation": return this.removeRelation(input, doc, domain);
      case "addIndex": return this.addIndex(input, doc, domain);
      default:
        return { doc, changes: [], resultText: `Error: tool "${toolName}" did not produce any change. Check the tool name and arguments.` };
    }
  }

  private addTable(input: Record<string, unknown>, doc: DiagramDocument, domain: DomainModule): ToolResult {
    const name = input["name"] as string;
    // Idempotent: don't create a second table with the same name (invalid + prevents loop duplication).
    const existingTable = doc.entities.find((e) => e.name.toLowerCase() === name.toLowerCase());
    if (existingTable) {
      return { doc, changes: [], resultText: `Table "${name}" already exists (id: ${existingTable.id}). No table created. Use its id with addColumn if you need to add columns.` };
    }
    const entityId = randomUUID();
    let updatedDoc = domain.addEntity(doc, { id: entityId, name });
    const logicalName = input["logicalName"] as string | undefined;
    if (logicalName !== undefined) updatedDoc = setEntityLogicalName(updatedDoc, entityId, logicalName);
    const changes: DiffChange[] = [{ type: "addTable", tableId: entityId, tableName: name }];

    const columns = input["columns"] as AddTableColumnInput[] | undefined;
    if (columns) {
      const seen = new Set<string>();
      let ordinal = 0;
      for (const col of columns) {
        const key = col.name.toLowerCase();
        if (seen.has(key)) continue; // skip duplicate column names within the same addTable
        seen.add(key);
        const colId = randomUUID();
        const column: DiagramColumn = {
          id: colId, name: col.name, type: col.type,
          nullable: col.nullable ?? true, primaryKey: col.primaryKey ?? false,
          unique: col.unique ?? false, defaultValue: null, comment: col.comment ?? null, ordinal: ordinal++,
        };
        updatedDoc = domain.addColumn(updatedDoc, entityId, column);
        changes.push({ type: "addColumn", tableId: entityId, tableName: name, columnId: colId, columnName: col.name, columnType: col.type, ...(col.comment ? { comment: col.comment } : {}) });
      }
    }
    return applied(updatedDoc, changes);
  }

  private removeTable(input: Record<string, unknown>, doc: DiagramDocument, domain: DomainModule): ToolResult {
    const tableId = input["tableId"] as string;
    const entity = doc.entities.find((e) => e.id === tableId);
    if (!entity) return tableNotFound(doc, tableId);
    const updatedDoc = domain.removeEntity(doc, tableId);
    return applied(updatedDoc, [{ type: "removeTable", tableId, tableName: entity.name }]);
  }

  private updateTable(input: Record<string, unknown>, doc: DiagramDocument, domain: DomainModule): ToolResult {
    const tableId = input["tableId"] as string;
    const entity = doc.entities.find((e) => e.id === tableId);
    if (!entity) return tableNotFound(doc, tableId);
    const newName = input["name"] as string | undefined;
    const logicalName = input["logicalName"] as string | undefined;
    if (newName === undefined && logicalName === undefined) {
      return {
        doc,
        changes: [],
        resultText: `Error: updateTable on "${entity.name}" received no fields to change. Pass name (rename) and/or logicalName (Korean logical name), then retry.`,
      };
    }
    let updatedDoc = doc;
    const changedFields: string[] = [];
    if (newName !== undefined) {
      updatedDoc = domain.renameEntity(updatedDoc, tableId, newName);
      changedFields.push("name");
    }
    if (logicalName !== undefined) {
      updatedDoc = setEntityLogicalName(updatedDoc, tableId, logicalName);
      changedFields.push("logicalName");
    }
    return applied(updatedDoc, [
      { type: "updateTable", tableId, oldName: entity.name, newName: newName ?? entity.name, changes: changedFields },
    ]);
  }

  private addColumn(input: Record<string, unknown>, doc: DiagramDocument, domain: DomainModule): ToolResult {
    const tableId = input["tableId"] as string;
    const entity = doc.entities.find((e) => e.id === tableId);
    if (!entity) return tableNotFound(doc, tableId);
    const colName = input["name"] as string;
    // Idempotent: a column with this name already exists → no-op with clear feedback (prevents loop duplication).
    const dup = entity.columns.find((c) => c.name.toLowerCase() === colName.toLowerCase());
    if (dup) {
      return { doc, changes: [], resultText: `Column "${colName}" already exists on ${entity.name} (id: ${dup.id}). No column added.` };
    }
    const colId = randomUUID();
    const column: DiagramColumn = {
      id: colId,
      name: input["name"] as string,
      type: input["type"] as string,
      nullable: (input["nullable"] as boolean | undefined) ?? true,
      primaryKey: (input["primaryKey"] as boolean | undefined) ?? false,
      unique: (input["unique"] as boolean | undefined) ?? false,
      defaultValue: (input["defaultValue"] as string | undefined) ?? null,
      comment: (input["comment"] as string | undefined) ?? null,
      ordinal: entity.columns.length,
    };
    const updatedDoc = domain.addColumn(doc, tableId, column);
    return applied(updatedDoc, [{ type: "addColumn", tableId, tableName: entity.name, columnId: colId, columnName: column.name, columnType: column.type, ...(column.comment ? { comment: column.comment } : {}) }]);
  }

  private removeColumn(input: Record<string, unknown>, doc: DiagramDocument, domain: DomainModule): ToolResult {
    const tableId = input["tableId"] as string;
    const colId = input["columnId"] as string;
    const entity = doc.entities.find((e) => e.id === tableId);
    if (!entity) return tableNotFound(doc, tableId);
    const col = entity.columns.find((c) => c.id === colId);
    if (!col) return columnNotFound(doc, entity.name, tableId, colId);
    const updatedDoc = domain.removeColumn(doc, tableId, colId);
    return applied(updatedDoc, [{ type: "removeColumn", tableId, tableName: entity.name, columnId: colId, columnName: col.name }]);
  }

  private updateColumn(input: Record<string, unknown>, doc: DiagramDocument, domain: DomainModule): ToolResult {
    const tableId = input["tableId"] as string;
    const colId = input["columnId"] as string;
    const entity = doc.entities.find((e) => e.id === tableId);
    if (!entity) return tableNotFound(doc, tableId);
    const col = entity.columns.find((c) => c.id === colId);
    if (!col) return columnNotFound(doc, entity.name, tableId, colId);
    const patch: Partial<Omit<DiagramColumn, "id">> = {};
    if (input["name"] !== undefined) patch.name = input["name"] as string;
    if (input["type"] !== undefined) patch.type = input["type"] as string;
    if (input["nullable"] !== undefined) patch.nullable = input["nullable"] as boolean;
    if (input["primaryKey"] !== undefined) patch.primaryKey = input["primaryKey"] as boolean;
    if (input["unique"] !== undefined) patch.unique = input["unique"] as boolean;
    if (input["defaultValue"] !== undefined) patch.defaultValue = input["defaultValue"] as string | null;
    if (input["comment"] !== undefined) patch.comment = input["comment"] as string | null;
    if (Object.keys(patch).length === 0) {
      return {
        doc,
        changes: [],
        resultText: `Error: updateColumn on "${entity.name}.${col.name}" received no fields to change. Pass at least one of name/type/nullable/primaryKey/unique/defaultValue/comment (comment = Korean logical name), then retry.`,
      };
    }
    const updatedDoc = domain.updateColumn(doc, tableId, colId, patch);
    return applied(updatedDoc, [{ type: "updateColumn", tableId, tableName: entity.name, columnId: colId, columnName: col.name, changes: Object.keys(patch) }]);
  }

  private addRelation(input: Record<string, unknown>, doc: DiagramDocument, domain: DomainModule): ToolResult {
    const relId = randomUUID();
    const src = doc.entities.find((e) => e.id === input["sourceTableId"]);
    if (!src) return tableNotFound(doc, input["sourceTableId"] as string);
    const tgt = doc.entities.find((e) => e.id === input["targetTableId"]);
    if (!tgt) return tableNotFound(doc, input["targetTableId"] as string);

    // FK는 대상 테이블의 PK를 참조해야 한다. PK 타입으로 FK 컬럼을 만들고 targetColumnIds를 채워
    // DDL 생성기가 관계를 주석으로 강등하지 않게 한다 (#83).
    const pkColumns = tgt.columns.filter((c) => c.primaryKey);
    if (pkColumns.length === 0) {
      return { doc, changes: [], resultText: `Error: 대상 테이블 "${tgt.name}" (id ${tgt.id})에 primary key 컬럼이 없어 FK 관계를 만들 수 없습니다. 먼저 addColumn 또는 updateColumn으로 primary key를 지정한 뒤 addRelation을 다시 시도하세요.` };
    }
    if (pkColumns.length > 1) {
      return { doc, changes: [], resultText: `Error: 대상 테이블 "${tgt.name}"의 primary key가 복합 키(${pkColumns.map((c) => c.name).join(", ")})입니다. addRelation 도구는 복합 PK 관계를 지원하지 않습니다.` };
    }
    const pk = pkColumns[0]!;

    let updatedDoc = doc;
    const changes: DiffChange[] = [];
    // fkColumnName이 생략되면 웹 에디터(EditorCanvas.analyzeFkMatch)와 같은 규칙으로 기본 이름을 파생한다:
    // <snake_case 대상 테이블명>_<PK 이름> (예: users + id → "users_id"). FK 컬럼을 항상 확보해
    // sourceColumnIds가 비지 않게 하고, DDL 생성기가 관계를 주석으로 강등하는 경로를 막는다.
    const fkColumnName = (input["fkColumnName"] as string | undefined) || `${toSnake(tgt.name)}_${pk.name}`;
    let fkColId: string;
    const alreadyExists = src.columns.find((c) => c.name === fkColumnName);
    if (!alreadyExists) {
      fkColId = randomUUID();
      const fkColumn: DiagramColumn = {
        id: fkColId, name: fkColumnName, type: pk.type,
        nullable: (input["fkNullable"] as boolean | undefined) ?? false,
        primaryKey: false, unique: false, defaultValue: null, comment: null,
        ordinal: src.columns.length,
      };
      updatedDoc = domain.addColumn(updatedDoc, src.id, fkColumn);
      changes.push({ type: "addColumn", tableId: src.id, tableName: src.name, columnId: fkColId, columnName: fkColumnName, columnType: pk.type });
    } else {
      // 타입이 다른 컬럼을 조용히 FK로 연결하면 잘못된 DDL이 나온다 → 명시적 오류로 self-correction 유도.
      if (alreadyExists.type.trim().toLowerCase() !== pk.type.trim().toLowerCase()) {
        return { doc, changes: [], resultText: `Error: 기존 컬럼 "${src.name}.${alreadyExists.name}"의 타입(${alreadyExists.type})이 대상 PK "${tgt.name}.${pk.name}"의 타입(${pk.type})과 달라 FK로 연결할 수 없습니다. updateColumn으로 타입을 "${pk.type}"으로 맞추거나 fkColumnName에 다른 이름을 지정한 뒤 addRelation을 다시 시도하세요.` };
      }
      fkColId = alreadyExists.id;
    }

    const rel: DiagramRelationship = {
      id: relId, name: "",
      sourceEntityId: input["sourceTableId"] as string,
      sourceColumnIds: [fkColId],
      targetEntityId: input["targetTableId"] as string,
      targetColumnIds: [pk.id],
      cardinality: input["cardinality"] as RelationshipCardinality,
      onDelete: "no-action", onUpdate: "no-action", identifying: false,
    };
    updatedDoc = domain.addRelationship(updatedDoc, rel);
    changes.push({ type: "addRelation", relationId: relId, fromTable: src.name, toTable: tgt.name, cardinality: input["cardinality"] as string });
    return applied(updatedDoc, changes);
  }

  private removeRelation(input: Record<string, unknown>, doc: DiagramDocument, domain: DomainModule): ToolResult {
    const relId = input["relationId"] as string;
    const rel = doc.relationships.find((r) => r.id === relId);
    if (!rel) return { doc, changes: [], resultText: `Error: no relationship found with id "${relId}". Inspect the current diagram's relationships and use a valid relation id. Do not invent ids.` };
    const src = doc.entities.find((e) => e.id === rel.sourceEntityId);
    const tgt = doc.entities.find((e) => e.id === rel.targetEntityId);
    const updatedDoc = domain.removeRelationship(doc, relId);
    return applied(updatedDoc, [{ type: "removeRelation", relationId: relId, fromTable: src?.name ?? rel.sourceEntityId, toTable: tgt?.name ?? rel.targetEntityId }]);
  }

  private addIndex(input: Record<string, unknown>, doc: DiagramDocument, domain: DomainModule): ToolResult {
    const tableId = input["tableId"] as string;
    const entity = doc.entities.find((e) => e.id === tableId);
    if (!entity) return tableNotFound(doc, tableId);
    const indexId = randomUUID();
    const columnIds = input["columnIds"] as string[];
    const missingCol = columnIds.find((cid) => !entity.columns.some((c) => c.id === cid));
    if (missingCol) return columnNotFound(doc, entity.name, tableId, missingCol);
    const unique = (input["unique"] as boolean | undefined) ?? false;
    const index: DiagramIndex = {
      id: indexId,
      entityId: tableId,
      name: input["name"] as string,
      columnIds,
      unique,
    };
    const updatedDoc = domain.addIndex(doc, index);
    const columnNames = columnIds.map((cid) => entity.columns.find((c) => c.id === cid)?.name ?? cid);
    return applied(updatedDoc, [{ type: "addIndex", indexId, tableName: entity.name, indexName: input["name"] as string, columnNames, unique }]);
  }
}

function describeChange(c: DiffChange): string {
  switch (c.type) {
    case "addTable": return `added table ${c.tableName} (id: ${c.tableId})`;
    case "removeTable": return `removed table ${c.tableName}`;
    case "updateTable":
      return c.oldName === c.newName
        ? `updated table ${c.newName} (${(c.changes ?? []).join(", ")})`
        : `renamed ${c.oldName} -> ${c.newName}`;
    case "addColumn": return `added column ${c.tableName}.${c.columnName} (id: ${c.columnId})`;
    case "removeColumn": return `removed column ${c.tableName}.${c.columnName}`;
    case "updateColumn": return `updated column ${c.tableName}.${c.columnName}`;
    case "addRelation": return `added relation ${c.fromTable}->${c.toTable}`;
    case "removeRelation": return `removed relation ${c.fromTable}->${c.toTable}`;
    case "addIndex": return `added index ${c.indexName} on ${c.tableName}`;
  }
}
