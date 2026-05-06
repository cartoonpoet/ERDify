import { parseDdl } from "./ddl-parser";

let uuidCounter = 0;
vi.mock("./uuid", () => ({
  randomUUID: vi.fn(() => `uuid-${++uuidCounter}`),
}));

beforeEach(() => {
  uuidCounter = 0;
});

describe("parseDdl", () => {
  it("단순 CREATE TABLE에서 엔티티 이름과 컬럼 이름/타입을 추출한다", () => {
    const sql = `CREATE TABLE users (id INT);`;
    const doc = parseDdl(sql, "postgresql");

    expect(doc.entities).toHaveLength(1);
    expect(doc.entities[0]!.name).toBe("users");
    expect(doc.entities[0]!.columns).toHaveLength(1);
    expect(doc.entities[0]!.columns[0]!.name).toBe("id");
    expect(doc.entities[0]!.columns[0]!.type).toBe("INT");
  });

  it("NOT NULL 컬럼은 nullable: false, 제약 없는 컬럼은 nullable: true", () => {
    const sql = `CREATE TABLE t (a VARCHAR(255) NOT NULL, b VARCHAR(255));`;
    const doc = parseDdl(sql, "mysql");

    const [a, b] = doc.entities[0]!.columns;
    expect(a!.nullable).toBe(false);
    expect(b!.nullable).toBe(true);
  });

  it("컬럼 레벨 PRIMARY KEY → primaryKey: true", () => {
    const sql = `CREATE TABLE t (id INT PRIMARY KEY);`;
    const doc = parseDdl(sql, "postgresql");

    expect(doc.entities[0]!.columns[0]!.primaryKey).toBe(true);
  });

  it("테이블 레벨 PRIMARY KEY (col) → 해당 컬럼의 primaryKey: true", () => {
    const sql = `CREATE TABLE t (id INT, PRIMARY KEY (id));`;
    const doc = parseDdl(sql, "mysql");

    expect(doc.entities[0]!.columns[0]!.primaryKey).toBe(true);
  });

  it("DEFAULT 'value' → defaultValue가 설정된다", () => {
    const sql = `CREATE TABLE t (status VARCHAR(20) DEFAULT 'active');`;
    const doc = parseDdl(sql, "mysql");

    expect(doc.entities[0]!.columns[0]!.defaultValue).toBe("'active'");
  });

  it("인라인 FOREIGN KEY REFERENCES → 올바른 source/target 엔티티 ID로 relationship 생성", () => {
    const sql = `
      CREATE TABLE orders (id INT PRIMARY KEY);
      CREATE TABLE items (
        id INT PRIMARY KEY,
        order_id INT,
        FOREIGN KEY (order_id) REFERENCES orders (id)
      );
    `;
    const doc = parseDdl(sql, "mysql");

    expect(doc.relationships).toHaveLength(1);
    const rel = doc.relationships[0]!;
    const ordersEntity = doc.entities.find((e) => e.name === "orders")!;
    const itemsEntity = doc.entities.find((e) => e.name === "items")!;
    expect(rel.sourceEntityId).toBe(itemsEntity.id);
    expect(rel.targetEntityId).toBe(ordersEntity.id);
  });

  it("ALTER TABLE ADD FOREIGN KEY → relationship 생성", () => {
    const sql = `
      CREATE TABLE departments (dept_id INT PRIMARY KEY);
      CREATE TABLE employees (emp_id INT PRIMARY KEY, dept_id INT);
      ALTER TABLE employees ADD FOREIGN KEY (dept_id) REFERENCES departments (dept_id);
    `;
    const doc = parseDdl(sql, "postgresql");

    expect(doc.relationships).toHaveLength(1);
    const rel = doc.relationships[0]!;
    const deptEntity = doc.entities.find((e) => e.name === "departments")!;
    const empEntity = doc.entities.find((e) => e.name === "employees")!;
    expect(rel.sourceEntityId).toBe(empEntity.id);
    expect(rel.targetEntityId).toBe(deptEntity.id);
  });

  it("ON DELETE CASCADE / ON UPDATE SET NULL → onDelete: 'cascade', onUpdate: 'set-null'", () => {
    const sql = `
      CREATE TABLE parent (id INT PRIMARY KEY);
      CREATE TABLE child (
        id INT PRIMARY KEY,
        parent_id INT,
        FOREIGN KEY (parent_id) REFERENCES parent (id) ON DELETE CASCADE ON UPDATE SET NULL
      );
    `;
    const doc = parseDdl(sql, "mysql");

    expect(doc.relationships).toHaveLength(1);
    const rel = doc.relationships[0]!;
    expect(rel.onDelete).toBe("cascade");
    expect(rel.onUpdate).toBe("set-null");
  });

  it("-- 및 /* */ 주석을 제거한 후 파싱한다", () => {
    const sql = `
      -- This is a line comment
      CREATE TABLE /* block comment */ accounts (
        id INT -- inline comment
      );
    `;
    const doc = parseDdl(sql, "postgresql");

    expect(doc.entities).toHaveLength(1);
    expect(doc.entities[0]!.name).toBe("accounts");
    expect(doc.entities[0]!.columns[0]!.name).toBe("id");
  });

  it("식별자 따옴표(백틱, 쌍따옴표, 대괄호)를 제거한다", () => {
    const sql1 = "CREATE TABLE `my_table` (`my_col` INT);";
    const sql2 = 'CREATE TABLE "my_table" ("my_col" INT);';
    const sql3 = "CREATE TABLE [my_table] ([my_col] INT);";

    for (const sql of [sql1, sql2, sql3]) {
      uuidCounter = 0;
      const doc = parseDdl(sql, "mssql");
      expect(doc.entities[0]!.name).toBe("my_table");
      expect(doc.entities[0]!.columns[0]!.name).toBe("my_col");
    }
  });

  it("반환값은 format: 'erdify.schema.v1'이고 dialect가 인자와 일치한다", () => {
    const sql = `CREATE TABLE t (id INT);`;
    const doc = parseDdl(sql, "mariadb");

    expect(doc.format).toBe("erdify.schema.v1");
    expect(doc.dialect).toBe("mariadb");
  });
});
