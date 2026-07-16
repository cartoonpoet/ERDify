import { generateDdl } from "@erdify/domain";
import { parseDdl, applySeedInserts } from "./ddl-parser";

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

  it("AUTO_INCREMENT → autoIncrement가 true로 파싱된다", () => {
    const sql = `CREATE TABLE t (id BIGINT NOT NULL AUTO_INCREMENT, PRIMARY KEY (id));`;
    const doc = parseDdl(sql, "mysql");

    expect(doc.entities[0]!.columns[0]!.autoIncrement).toBe(true);
  });

  it("AUTO_INCREMENT 없으면 autoIncrement가 false다", () => {
    const sql = `CREATE TABLE t (id BIGINT NOT NULL);`;
    const doc = parseDdl(sql, "mysql");

    expect(doc.entities[0]!.columns[0]!.autoIncrement).toBe(false);
  });

  it("복합 UNIQUE → DiagramIndex로 보존하고 구성 컬럼엔 boolean unique를 찍지 않는다", () => {
    const sql = `CREATE TABLE t (
      a INT, b INT, c INT,
      UNIQUE (a, b, c)
    );`;
    const doc = parseDdl(sql, "mysql");

    expect(doc.indexes).toHaveLength(1);
    expect(doc.indexes[0]!.unique).toBe(true);
    expect(doc.indexes[0]!.columnIds).toHaveLength(3);
    // 복합 제약은 개별 컬럼 unique로 평탄화되지 않아야 한다
    expect(doc.entities[0]!.columns.every((col) => col.unique === false)).toBe(true);
  });

  it("named UNIQUE KEY의 이름을 인덱스 이름으로 보존한다", () => {
    const sql = `CREATE TABLE t (a INT, b INT, UNIQUE KEY uq_ab (a, b));`;
    const doc = parseDdl(sql, "mysql");

    expect(doc.indexes[0]!.name).toBe("uq_ab");
  });

  it("CONSTRAINT ... UNIQUE 이름을 인덱스 이름으로 보존한다", () => {
    const sql = `CREATE TABLE t (a INT, b INT, CONSTRAINT ux_t UNIQUE (a, b));`;
    const doc = parseDdl(sql, "mysql");

    expect(doc.indexes[0]!.name).toBe("ux_t");
  });

  it("단일 컬럼 UNIQUE는 컬럼 boolean으로 유지하고 인덱스를 만들지 않는다", () => {
    const sql = `CREATE TABLE t (email VARCHAR(255), UNIQUE (email));`;
    const doc = parseDdl(sql, "mysql");

    expect(doc.indexes).toHaveLength(0);
    expect(doc.entities[0]!.columns[0]!.unique).toBe(true);
  });

  it("복합 UNIQUE 라운드트립: parse → generateDdl에서 CREATE UNIQUE INDEX로 복원", () => {
    const sql = `CREATE TABLE t (a INT, b INT, UNIQUE KEY uq_ab (a, b));`;
    const doc = parseDdl(sql, "mysql");
    const out = generateDdl(doc);

    expect(out).toContain("CREATE UNIQUE INDEX `uq_ab` ON `t` (`a`, `b`)");
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

  it("INSERT INTO로 seedData가 엔티티에 저장된다", () => {
    const sql = `
      CREATE TABLE codes (code VARCHAR(10) NOT NULL, name VARCHAR(100));
      INSERT INTO codes (code, name) VALUES ('A001', '항목1'), ('A002', '항목2');
    `;
    const doc = parseDdl(sql, "mysql");

    const entity = doc.entities.find((e) => e.name === "codes")!;
    expect(entity.seedData).toHaveLength(2);
    expect(Object.values(entity.seedData![0]!)).toContain("A001");
    expect(Object.values(entity.seedData![1]!)).toContain("항목2");
  });

  it("UTF-8 BOM(\\uFEFF)이 파일 앞에 있어도 INSERT INTO를 정상 파싱한다", () => {
    const schemaFile = `CREATE TABLE codes (code VARCHAR(10) NOT NULL, name VARCHAR(100));`;
    const seedFile = `\uFEFFINSERT INTO codes (code, name) VALUES ('A001', '항목1'), ('A002', '항목2');`;
    const combined = schemaFile + "\n\n" + seedFile;

    const doc = parseDdl(combined, "mysql");

    const entity = doc.entities.find((e) => e.name === "codes")!;
    expect(entity.seedData).toHaveLength(2);
  });

  it("schema prefix(Common.Code)가 붙은 INSERT INTO를 schema 없는 CREATE TABLE과 매칭한다", () => {
    const schemaFile = "CREATE TABLE `Code` (`GroupCode` VARCHAR(10) NOT NULL, `Remarks` VARCHAR(100));";
    const seedFile = `\uFEFFINSERT INTO Common.Code (GroupCode, Remarks) VALUES ('GRP1', '그룹1'), ('GRP2', '그룹2');`;
    const combined = schemaFile + "\n\n" + seedFile;

    const doc = parseDdl(combined, "mysql");

    const entity = doc.entities.find((e) => e.name === "Code")!;
    expect(entity.seedData).toHaveLength(2);
    expect(Object.values(entity.seedData![0]!)).toContain("GRP1");
  });

  it("MSSQL GO 배치 구분자로 나뉜 여러 CREATE TABLE을 각각 파싱한다", () => {
    const sql = `
      CREATE TABLE a (id INT);
      GO
      CREATE TABLE b (id INT);
    `;
    const doc = parseDdl(sql, "mssql");

    expect(doc.entities.map((e) => e.name).sort()).toEqual(["a", "b"]);
  });

  it("공백만 있는 줄이 섞여 있어도 세미콜론과 GO로 정상 분리된다", () => {
    const sql = "CREATE TABLE a (id INT);\n   \n\nGO\n\n   \nCREATE TABLE b (id INT);";
    const doc = parseDdl(sql, "mssql");

    expect(doc.entities.map((e) => e.name).sort()).toEqual(["a", "b"]);
  });
});

describe("applySeedInserts", () => {
  beforeEach(() => {
    uuidCounter = 0;
  });

  it("INSERT-only SQL을 기존 엔티티에 매칭하여 seedData를 추가한다", () => {
    const schema = `CREATE TABLE codes (code VARCHAR(10) NOT NULL, name VARCHAR(100));`;
    const baseDoc = parseDdl(schema, "mysql");
    const existingEntity = baseDoc.entities[0]!;

    const seedSql = `INSERT INTO codes (code, name) VALUES ('A001', '항목1'), ('A002', '항목2');`;
    const updated = applySeedInserts(seedSql, [existingEntity]);

    expect(updated[0]!.seedData).toHaveLength(2);
    expect(Object.values(updated[0]!.seedData![0]!)).toContain("A001");
  });

  it("schema prefix(Common.Code)가 붙은 INSERT INTO를 기존 엔티티에 매칭한다", () => {
    const schema = `CREATE TABLE \`Code\` (\`GroupCode\` VARCHAR(10) NOT NULL, \`Remarks\` VARCHAR(100));`;
    const baseDoc = parseDdl(schema, "mysql");
    const existingEntity = baseDoc.entities[0]!;

    const seedSql = `\uFEFFINSERT INTO Common.Code (GroupCode, Remarks) VALUES ('GRP1', '그룹1'), ('GRP2', '그룹2');`;
    const updated = applySeedInserts(seedSql, [existingEntity]);

    expect(updated[0]!.seedData).toHaveLength(2);
    expect(Object.values(updated[0]!.seedData![0]!)).toContain("GRP1");
  });

  it("매칭되는 엔티티가 없으면 기존 엔티티 배열을 그대로 반환한다", () => {
    const schema = `CREATE TABLE foo (id INT);`;
    const baseDoc = parseDdl(schema, "mysql");
    const entities = baseDoc.entities;

    const seedSql = `INSERT INTO bar (id) VALUES (1);`;
    const updated = applySeedInserts(seedSql, entities);

    expect(updated).toBe(entities); // same reference — no changes
  });
});
