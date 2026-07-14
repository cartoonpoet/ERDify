import { describe, expect, it } from "vitest";
import { AI_MODELS } from "./models.js";

describe("AI_MODELS", () => {
  it("공식 API에 존재하는 GPT-5.5 모델만 노출한다", () => {
    const gpt55Models = AI_MODELS
      .filter(({ provider, value }) => provider === "openai" && value.startsWith("gpt-5.5"))
      .map(({ value }) => value);

    expect(gpt55Models).toEqual(["gpt-5.5"]);
  });
});
