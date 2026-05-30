import { describe, it, expect, vi } from "vitest";
import { toGeminiFunctionDeclarations } from "./gemini.provider";

vi.mock("@google/generative-ai", () => ({ GoogleGenerativeAI: vi.fn() }));

describe("toGeminiFunctionDeclarations", () => {
  it("properties가 있는 도구는 parameters를 포함하고 중첩 스키마를 보존한다", () => {
    const [decl] = toGeminiFunctionDeclarations([
      {
        name: "addTable",
        description: "add",
        input_schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            columns: { type: "array", items: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } },
          },
          required: ["name"],
        },
      },
    ]);
    expect(decl!.name).toBe("addTable");
    const params = decl!.parameters as unknown as { type: string; properties: Record<string, { type: string; items?: { type: string } }> };
    expect(params.type).toBe("object");
    expect(params.properties["name"]!.type).toBe("string");
    expect(params.properties["columns"]!.items!.type).toBe("object");
  });

  it("properties가 비어있는 도구는 parameters를 생략한다", () => {
    const [decl] = toGeminiFunctionDeclarations([
      { name: "listTables", description: "list", input_schema: { type: "object", properties: {} } },
    ]);
    expect(decl!.parameters).toBeUndefined();
  });

  it("enum 문자열에는 format:'enum'을 추가한다", () => {
    const [decl] = toGeminiFunctionDeclarations([
      {
        name: "addRelation",
        description: "rel",
        input_schema: {
          type: "object",
          properties: { cardinality: { type: "string", enum: ["one-to-one", "one-to-many"] } },
          required: ["cardinality"],
        },
      },
    ]);
    const params = decl!.parameters as unknown as { properties: Record<string, { format?: string; enum?: string[] }> };
    expect(params.properties["cardinality"]!.format).toBe("enum");
    expect(params.properties["cardinality"]!.enum).toEqual(["one-to-one", "one-to-many"]);
  });
});
