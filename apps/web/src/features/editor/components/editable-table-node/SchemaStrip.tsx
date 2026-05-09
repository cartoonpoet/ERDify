import { getSchemaColor } from "../../../../shared/utils/schema-colors";

export const SchemaStrip = ({
  schema,
  allSchemas,
}: {
  schema: string;
  allSchemas: string[];
}) => {
  const color = getSchemaColor(schema, allSchemas);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 5,
      padding: "3px 10px 3px 12px",
      fontSize: 9, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase",
      borderBottom: `1px solid ${color}30`,
      background: `${color}10`,
      color,
      flexShrink: 0,
    }}>
      <div style={{ width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0 }} />
      {schema}
    </div>
  );
};
