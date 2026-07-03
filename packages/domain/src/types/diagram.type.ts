export type DiagramDialect = "postgresql" | "mysql" | "mariadb" | "mssql";

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
  /** AUTO_INCREMENT(MySQL/MariaDB) 여부. 기존 저장 데이터 호환을 위해 optional(undefined=false). */
  autoIncrement?: boolean;
  ordinal: number;
}

// columnId → value (빈 문자열은 NULL로 처리)
export type SeedRow = Record<string, string>;

export interface DiagramEntity {
  id: string;
  schema?: string | null;
  name: string;
  logicalName: string | null;
  comment: string | null;
  color: string | null;
  columns: DiagramColumn[];
  seedData?: SeedRow[];
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
  identifying: boolean;
}

export interface DiagramIndex {
  id: string;
  entityId: string;
  name: string;
  columnIds: string[];
  unique: boolean;
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
  indexes: DiagramIndex[];
  views: [];
  layout: DiagramLayout;
  metadata: DiagramMetadata;
}

export interface DiagramValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * DDL export 경고 코드. export 엔진이 실행 불가능한 SQL을 출력하는 대신
 * 해당 항목을 주석으로 강등하고 이 코드로 경고를 남긴다.
 * 새 producer(식별자 검증, 참조 무결성, 민감정보 등)가 추가되면 코드를 확장한다.
 */
export type DdlWarningCode =
  | "fk_missing_entity"
  | "fk_unresolved_columns"
  | "fk_column_count_mismatch"
  | "autoincrement_not_keyed"
  | "autoincrement_multiple";

export interface DdlWarning {
  code: DdlWarningCode;
  /** 사람이 읽을 수 있는 경고 메시지 */
  message: string;
  /** 관련 엔티티(테이블) 이름 */
  entity?: string;
  /** 관련 컬럼 이름 */
  column?: string;
  /** 관련 관계(제약) 이름 또는 id */
  relationship?: string;
}

/** generateDdlReport 결과: SQL과 경고 목록을 함께 반환하는 export 채널 */
export interface DdlReport {
  sql: string;
  warnings: DdlWarning[];
}
