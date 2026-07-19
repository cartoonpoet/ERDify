export const SCHEMA_PALETTE = [
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#6b7280",
] as const;

export function getSchemaColor(
  schemaName: string,
  allSchemas: string[],
  overrides: Record<string, string> = {}
): string {
  if (overrides[schemaName]) return overrides[schemaName];
  const index = allSchemas.indexOf(schemaName);
  if (index === -1) return "#6b7280";
  return SCHEMA_PALETTE[index % SCHEMA_PALETTE.length] ?? "#6b7280";
}

export function getSchemasFromDocument(entities: { schema?: string | null }[]): string[] {
  const seen = new Set<string>();
  for (const e of entities) {
    if (e.schema) seen.add(e.schema);
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}
