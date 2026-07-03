import type { DiagramColumn, DiagramIndex } from "@erdify/domain";
import { randomUUID } from "@/shared/utils/uuid";

export const DEFAULT_HEADER_COLOR = "#0064E0";

export const PRESET_COLORS = [
  "#374151",
  "#0064E0",
  "#7c3aed",
  "#059669",
  "#dc2626",
  "#d97706",
  "#db2777",
  "#0891b2",
];

export const COLUMN_TYPES = [
  "varchar(255)", "text", "int", "bigint", "boolean",
  "timestamp", "uuid", "decimal(10,2)", "json", "jsonb",
];

export const makeColumn = (ordinal: number): DiagramColumn => ({
  id: randomUUID(),
  name: "column",
  type: "varchar(255)",
  nullable: true,
  primaryKey: false,
  unique: false,
  defaultValue: null,
  comment: null,
  autoIncrement: false,
  ordinal,
});

export const makeIndex = (entityId: string, entityName: string): DiagramIndex => {
  const safeName = entityName.replace(/\s+/g, "_").toLowerCase();
  return {
    id: randomUUID(),
    entityId,
    name: `idx_${safeName}`,
    columnIds: [],
    unique: false,
  };
};
