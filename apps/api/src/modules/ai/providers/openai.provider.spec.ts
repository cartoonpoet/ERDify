import { describe, it, expect, vi } from "vitest";
import { toOpenAiTools } from "./openai.provider";

vi.mock("openai", () => ({ default: vi.fn() }));

describe("toOpenAiTools", () => {
  it("Anthropic tool 정의를 OpenAI function 형식으로 변환한다", () => {
    const out = toOpenAiTools([{ name: "addTable", description: "d", input_schema: { type: "object" } }]);
    expect(out[0]).toEqual({ type: "function", function: { name: "addTable", description: "d", parameters: { type: "object" } } });
  });
});
