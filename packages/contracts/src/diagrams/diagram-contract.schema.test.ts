import { describe, expect, it } from "vitest";
import { createDiagramRequestSchema } from "./diagram-contract.schema";

describe("diagram contracts", () => {
  it("accepts a valid diagram create request", () => {
    const parsed = createDiagramRequestSchema.parse({
      projectId: "project_1",
      name: "Legal Standard ERD",
      dialect: "postgresql"
    });

    expect(parsed).toEqual({
      projectId: "project_1",
      name: "Legal Standard ERD",
      dialect: "postgresql"
    });
  });

  it("rejects an unsupported dialect", () => {
    const result = createDiagramRequestSchema.safeParse({
      projectId: "project_1",
      name: "Legal Standard ERD",
      dialect: "oracle"
    });

    expect(result.success).toBe(false);
  });
});
