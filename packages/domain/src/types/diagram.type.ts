export type DiagramDialect = "postgresql" | "mysql" | "mariadb";

export type RelationshipCardinality = "one-to-one" | "one-to-many" | "many-to-one";

export type ReferentialAction = "cascade" | "restrict" | "set-null" | "no-action";

export interface DiagramColumn {
  id: string;
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  unique: boolean;
  defaultValue: string | null;
  comment: string | null;
  ordinal: number;
}

export interface DiagramEntity {
  id: string;
  name: string;
  logicalName: string | null;
  comment: string | null;
  columns: DiagramColumn[];
}

export interface DiagramRelationship {
  id: string;
  name: string;
  sourceEntityId: string;
  sourceColumnIds: string[];
  targetEntityId: string;
  targetColumnIds: string[];
  cardinality: RelationshipCardinality;
  onDelete: ReferentialAction;
  onUpdate: ReferentialAction;
}

export interface DiagramMetadata {
  revision: number;
  stableObjectIds: true;
  createdAt: string;
  updatedAt: string;
}

export interface EntityPosition {
  x: number;
  y: number;
}

export interface DiagramLayout {
  entityPositions: Record<string, EntityPosition>;
}

export interface DiagramDocument {
  format: "erdify.schema.v1";
  id: string;
  name: string;
  dialect: DiagramDialect;
  entities: DiagramEntity[];
  relationships: DiagramRelationship[];
  indexes: [];
  views: [];
  layout: DiagramLayout;
  metadata: DiagramMetadata;
}

export interface DiagramValidationResult {
  valid: boolean;
  errors: string[];
}
