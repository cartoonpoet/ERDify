import type { DiagramEntity } from "@erdify/domain";

import { assertColumnsExist, buildColumn } from "./write-tools.js";

describe("buildColumn", () => {
  it("컬럼 추가 시 논리명(comment)을 반영한다", () => {
    const column = buildColumn({ name: "email", type: "varchar", comment: "이메일" }, 0);

    expect(column.name).toBe("email");
    expect(column.comment).toBe("이메일");
  });

  it("comment 미전달 시 null로 초기화한다", () => {
    const column = buildColumn({ name: "email", type: "varchar" }, 0);

    expect(column.comment).toBeNull();
  });

  it("기본값(nullable/primaryKey/unique/defaultValue)을 적용한다", () => {
    const column = buildColumn({ name: "email", type: "varchar" }, 3);

    expect(column.nullable).toBe(true);
    expect(column.primaryKey).toBe(false);
    expect(column.unique).toBe(false);
    expect(column.defaultValue).toBeNull();
    expect(column.ordinal).toBe(3);
  });
});

describe("assertColumnsExist", () => {
  const entity: DiagramEntity = {
    id: "e1",
    name: "users",
    logicalName: null,
    comment: null,
    color: null,
    columns: [buildColumn({ name: "id", type: "uuid" }, 0)],
  };
  // buildColumn이 부여한 실제 컬럼 id로 검증
  const validId = entity.columns[0]!.id;

  it("존재하는 컬럼 id면 통과한다", () => {
    expect(() => assertColumnsExist(entity, [validId], "Source")).not.toThrow();
  });

  it("빈 배열이면 통과한다 (컬럼 미지정 관계 허용)", () => {
    expect(() => assertColumnsExist(entity, [], "Source")).not.toThrow();
  });

  it("존재하지 않는 컬럼 id면 테이블명과 함께 에러를 던진다", () => {
    expect(() => assertColumnsExist(entity, ["ghost"], "Target")).toThrow(/Target table "users".*ghost/);
  });
});
