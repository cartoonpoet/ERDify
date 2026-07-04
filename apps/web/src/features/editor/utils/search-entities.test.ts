import { describe, expect, it } from "vitest";
import type { DiagramColumn, DiagramEntity } from "@erdify/domain";
import { searchEntities } from "./search-entities";

const makeColumn = (overrides: Partial<DiagramColumn> & Pick<DiagramColumn, "id" | "name">): DiagramColumn => ({
  type: "varchar",
  nullable: false,
  primaryKey: false,
  unique: false,
  defaultValue: null,
  comment: null,
  ordinal: 0,
  ...overrides,
});

const entities: DiagramEntity[] = [
  {
    id: "e-1",
    name: "users",
    logicalName: null,
    comment: null,
    color: null,
    columns: [
      makeColumn({ id: "c-1", name: "id" }),
      makeColumn({ id: "c-2", name: "Email" }),
    ],
  },
  {
    id: "e-2",
    name: "orders",
    logicalName: null,
    comment: "주문 테이블",
    color: null,
    columns: [
      makeColumn({ id: "c-3", name: "user_id" }),
      makeColumn({ id: "c-4", name: "amount" }),
    ],
  },
];

describe("searchEntities", () => {
  it("빈 query면 전체 테이블을 table 결과로 반환한다", () => {
    const results = searchEntities(entities, "");

    expect(results).toEqual([
      { type: "table", entityId: "e-1", entityName: "users", columnCount: 2 },
      { type: "table", entityId: "e-2", entityName: "orders", columnCount: 2 },
    ]);
  });

  it("공백만 있는 query도 빈 query와 동일하게 처리한다", () => {
    const results = searchEntities(entities, "   ");

    expect(results).toHaveLength(2);
    expect(results.every((r) => r.type === "table")).toBe(true);
  });

  it("테이블명 매칭 시 table 결과를 반환한다", () => {
    const results = searchEntities(entities, "user");

    expect(results).toEqual(
      expect.arrayContaining([
        { type: "table", entityId: "e-1", entityName: "users", columnCount: 2 },
      ])
    );
  });

  it("테이블 comment 매칭 시 table 결과를 반환한다", () => {
    const results = searchEntities(entities, "주문");

    expect(results).toEqual([
      { type: "table", entityId: "e-2", entityName: "orders", columnCount: 2 },
    ]);
  });

  it("컬럼명 부분일치·대소문자무시 시 column 결과를 반환한다", () => {
    const results = searchEntities(entities, "mail");

    expect(results).toEqual([
      { type: "column", entityId: "e-1", entityName: "users", columnId: "c-2", columnName: "Email" },
    ]);
  });

  it("테이블명과 컬럼명이 동시 매칭되면 table 결과 뒤에 해당 엔티티의 column 결과가 이어진다", () => {
    const results = searchEntities(entities, "user");

    expect(results).toEqual([
      { type: "table", entityId: "e-1", entityName: "users", columnCount: 2 },
      { type: "column", entityId: "e-2", entityName: "orders", columnId: "c-3", columnName: "user_id" },
    ]);
  });

  it("매칭이 없으면 빈 배열을 반환한다", () => {
    const results = searchEntities(entities, "zzznomatch");

    expect(results).toEqual([]);
  });

  it("table 결과와 column 결과는 각 유형에 맞는 필드만 가진다", () => {
    const tableResult = searchEntities(entities, "orders")[0];
    const columnResult = searchEntities(entities, "mail")[0];

    expect(tableResult).toEqual({
      type: "table",
      entityId: "e-2",
      entityName: "orders",
      columnCount: 2,
    });
    expect(columnResult).toEqual({
      type: "column",
      entityId: "e-1",
      entityName: "users",
      columnId: "c-2",
      columnName: "Email",
    });
  });
});
