import { buildColumn } from "./write-tools.js";

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
