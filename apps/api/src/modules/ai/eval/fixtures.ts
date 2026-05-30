import type { DiagramDocument } from "@erdify/domain";

/** 평가용 고정 다이어그램. 의도적으로 심어둔 이슈가 있어 결정적 검증의 기준이 된다. */
function base(id: string, name: string): DiagramDocument {
  return {
    format: "erdify.schema.v1",
    id,
    name,
    dialect: "postgresql",
    entities: [],
    relationships: [],
    indexes: [],
    views: [],
    layout: { entityPositions: {} },
    metadata: { revision: 1, stableObjectIds: true, createdAt: "", updatedAt: "" },
  };
}

const pk = (id: string, name: string, type = "uuid") => ({
  id, name, type, nullable: false, primaryKey: true, unique: false, defaultValue: null, comment: null, ordinal: 0,
});
const col = (id: string, name: string, type: string, ordinal: number, extra: Partial<{ nullable: boolean; unique: boolean }> = {}) => ({
  id, name, type, nullable: extra.nullable ?? true, primaryKey: false, unique: extra.unique ?? false, defaultValue: null, comment: null, ordinal,
});

/**
 * 쇼핑몰 스키마. 심어둔 이슈:
 * - orders.user_id 는 FK인데 인덱스가 없음 (fk_without_index)
 * - order_items 에 반복 컬럼군 product1/product2 (repeating_group)
 */
export const shopWithIssues: DiagramDocument = (() => {
  const d = base("shop", "shop");
  d.entities = [
    { id: "users", name: "users", logicalName: null, comment: null, color: null, columns: [pk("u_id", "id"), col("u_email", "email", "varchar", 1, { nullable: false }), col("u_created", "created_at", "timestamptz", 2, { nullable: false })] },
    { id: "orders", name: "orders", logicalName: null, comment: null, color: null, columns: [pk("o_id", "id"), col("o_user", "user_id", "uuid", 1, { nullable: false }), col("o_total", "total", "numeric", 2)] },
    { id: "order_items", name: "order_items", logicalName: null, comment: null, color: null, columns: [pk("oi_id", "id"), col("oi_order", "order_id", "uuid", 1, { nullable: false }), col("oi_p1", "product1", "varchar", 2), col("oi_p2", "product2", "varchar", 3)] },
  ];
  d.relationships = [
    { id: "r_orders_users", name: "", sourceEntityId: "orders", sourceColumnIds: ["o_user"], targetEntityId: "users", targetColumnIds: ["u_id"], cardinality: "many-to-one", onDelete: "no-action", onUpdate: "no-action", identifying: false },
    { id: "r_items_orders", name: "", sourceEntityId: "order_items", sourceColumnIds: ["oi_order"], targetEntityId: "orders", targetColumnIds: ["o_id"], cardinality: "many-to-one", onDelete: "no-action", onUpdate: "no-action", identifying: false },
  ];
  // order_items.order_id 에는 인덱스를 둬서 orders.user_id 만 fk_without_index 로 검출되게 한다
  d.indexes = [{ id: "idx_items_order", entityId: "order_items", name: "idx_order_items_order_id", columnIds: ["oi_order"], unique: false }];
  return d;
})();

/** 이슈가 없는 깨끗한 스키마(폴스파지티브 회귀 방지용). */
export const cleanSchema: DiagramDocument = (() => {
  const d = base("clean", "clean");
  d.entities = [
    { id: "users", name: "users", logicalName: null, comment: null, color: null, columns: [pk("u_id", "id"), col("u_email", "email", "varchar", 1, { nullable: false, unique: true })] },
  ];
  return d;
})();
