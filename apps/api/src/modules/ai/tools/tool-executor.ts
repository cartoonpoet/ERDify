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
/** 변경이 적용된 문서를 사람이 읽을 수 있는 요약과 함께 ToolResult로 포장한다. */
const applied = (doc: DiagramDocument, changes: DiffChange[]): ToolResult => ({
  doc,
  changes,
  resultText: `Applied: ${changes.map(describeChange).join("; ")}`,
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
    const newName = input["name"] as string;
    const updatedDoc = domain.renameEntity(doc, tableId, newName);
    return applied(updatedDoc, [{ type: "updateTable", tableId, oldName: entity.name, newName }]);
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
    if (Object.keys(patch).length === 0) {
      return {
        doc,
        changes: [],
        resultText: `Error: updateColumn on "${entity.name}.${col.name}" received no fields to change. Pass at least one of name/type/nullable/primaryKey/unique/defaultValue, then retry.`,
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

    let updatedDoc = doc;
    const changes: DiffChange[] = [];
    const fkColumnName = input["fkColumnName"] as string | undefined;
    let fkColId: string | undefined;
    if (fkColumnName) {
      const alreadyExists = src.columns.find((c) => c.name === fkColumnName);
      if (!alreadyExists) {
        fkColId = randomUUID();
        const fkColumn: DiagramColumn = {
          id: fkColId, name: fkColumnName, type: "uuid",
          nullable: (input["fkNullable"] as boolean | undefined) ?? false,
          primaryKey: false, unique: false, defaultValue: null, comment: null,
          ordinal: src.columns.length,
        };
        updatedDoc = domain.addColumn(updatedDoc, src.id, fkColumn);
        changes.push({ type: "addColumn", tableId: src.id, tableName: src.name, columnId: fkColId, columnName: fkColumnName, columnType: "uuid" });
      } else {
        fkColId = alreadyExists.id;
      }
    }

    const rel: DiagramRelationship = {
      id: relId, name: "",
      sourceEntityId: input["sourceTableId"] as string,
      sourceColumnIds: fkColId ? [fkColId] : [],
      targetEntityId: input["targetTableId"] as string,
      targetColumnIds: [],
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
    case "updateTable": return `renamed ${c.oldName} -> ${c.newName}`;
    case "addColumn": return `added column ${c.tableName}.${c.columnName} (id: ${c.columnId})`;
    case "removeColumn": return `removed column ${c.tableName}.${c.columnName}`;
    case "updateColumn": return `updated column ${c.tableName}.${c.columnName}`;
    case "addRelation": return `added relation ${c.fromTable}->${c.toTable}`;
    case "removeRelation": return `removed relation ${c.fromTable}->${c.toTable}`;
    case "addIndex": return `added index ${c.indexName} on ${c.tableName}`;
  }
}
