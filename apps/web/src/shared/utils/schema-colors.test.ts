import { describe, expect, it } from "vitest";
import { SCHEMA_PALETTE, getSchemaColor, getSchemasFromDocument } from "./schema-colors";

describe("SCHEMA_PALETTE", () => {
  it("is a non-empty array of hex color strings", () => {
    expect(SCHEMA_PALETTE.length).toBeGreaterThan(0);
    for (const color of SCHEMA_PALETTE) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("has 10 colors", () => {
    expect(SCHEMA_PALETTE).toHaveLength(10);
  });
});

describe("getSchemaColor", () => {
  const allSchemas = ["public", "auth", "billing"];

  it("returns the color at the correct palette index for the first schema", () => {
    expect(getSchemaColor("public", allSchemas)).toBe(SCHEMA_PALETTE[0]);
  });

  it("returns the color at the correct palette index for the second schema", () => {
    expect(getSchemaColor("auth", allSchemas)).toBe(SCHEMA_PALETTE[1]);
  });

  it("returns the color at the correct palette index for the third schema", () => {
    expect(getSchemaColor("billing", allSchemas)).toBe(SCHEMA_PALETTE[2]);
  });

  it("returns the fallback gray (#6b7280) when schemaName is not in allSchemas", () => {
    expect(getSchemaColor("unknown", allSchemas)).toBe("#6b7280");
  });

  it("returns the fallback gray when allSchemas is empty", () => {
    expect(getSchemaColor("public", [])).toBe("#6b7280");
  });

  it("wraps around using modulo when schema index exceeds palette length", () => {
    const manySchemas = Array.from({ length: SCHEMA_PALETTE.length + 2 }, (_, i) => `schema${i}`);
    const overflowSchema = manySchemas[SCHEMA_PALETTE.length];
    expect(getSchemaColor(overflowSchema!, manySchemas)).toBe(SCHEMA_PALETTE[0]);
  });

  it("returns the override color when an override is provided", () => {
    const overrides = { public: "#ff0000" };
    expect(getSchemaColor("public", allSchemas, overrides)).toBe("#ff0000");
  });

  it("ignores the override when the schema is not in overrides", () => {
    const overrides = { other: "#ff0000" };
    expect(getSchemaColor("public", allSchemas, overrides)).toBe(SCHEMA_PALETTE[0]);
  });

  it("returns override color even when schemaName is not in allSchemas", () => {
    const overrides = { unknown: "#aabbcc" };
    expect(getSchemaColor("unknown", allSchemas, overrides)).toBe("#aabbcc");
  });

  it("is deterministic — same input always produces the same output", () => {
    const result1 = getSchemaColor("auth", allSchemas);
    const result2 = getSchemaColor("auth", allSchemas);
    expect(result1).toBe(result2);
  });

  it("defaults overrides to an empty object when not provided", () => {
    expect(() => getSchemaColor("public", allSchemas)).not.toThrow();
  });
});

describe("getSchemasFromDocument", () => {
  it("returns an empty array when entities array is empty", () => {
    expect(getSchemasFromDocument([])).toEqual([]);
  });

  it("returns an empty array when all entities have no schema", () => {
    expect(getSchemasFromDocument([{ schema: null }, { schema: null }])).toEqual([]);
  });

  it("returns unique schema names from entities", () => {
    const entities = [
      { schema: "public" },
      { schema: "auth" },
      { schema: "public" },
    ];
    expect(getSchemasFromDocument(entities)).toEqual(["auth", "public"]);
  });

  it("returns schemas sorted alphabetically", () => {
    const entities = [
      { schema: "zzz" },
      { schema: "aaa" },
      { schema: "mmm" },
    ];
    expect(getSchemasFromDocument(entities)).toEqual(["aaa", "mmm", "zzz"]);
  });

  it("excludes entities with empty string schema", () => {
    const entities = [{ schema: "" }, { schema: "public" }];
    expect(getSchemasFromDocument(entities)).toEqual(["public"]);
  });

  it("excludes entities with null schema", () => {
    const entities = [{ schema: null }, { schema: "auth" }];
    expect(getSchemasFromDocument(entities)).toEqual(["auth"]);
  });

  it("excludes entities with null schema when the valid schema is billing", () => {
    const entities = [{ schema: null }, { schema: "billing" }];
    expect(getSchemasFromDocument(entities)).toEqual(["billing"]);
  });

  it("is deterministic — same input always produces the same output", () => {
    const entities = [{ schema: "beta" }, { schema: "alpha" }];
    expect(getSchemasFromDocument(entities)).toEqual(getSchemasFromDocument(entities));
  });

  it("returns a single schema when only one is present", () => {
    const entities = [{ schema: "public" }, { schema: "public" }];
    expect(getSchemasFromDocument(entities)).toEqual(["public"]);
  });
});
