import { describe, it, expect, vi, beforeEach } from "vitest";
import { OpenAiProvider, toOpenAiTools } from "./openai.provider";
import type { ConvMessage } from "./provider.types";
import type { Tool } from "@anthropic-ai/sdk/resources";

let createMock: ReturnType<typeof vi.fn>;

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: (...args: unknown[]) => createMock(...args) } },
  })),
}));

/** SDK 스트림을 흉내내는 async-iterable 청크 시퀀스. */
async function* chunkStream(chunks: unknown[]): AsyncGenerator<unknown> {
  for (const c of chunks) yield c;
}

const tools: Tool[] = [{ name: "addTable", description: "d", input_schema: { type: "object" } }];

describe("toOpenAiTools", () => {
  it("Anthropic tool 정의를 OpenAI function 형식으로 변환한다", () => {
    const out = toOpenAiTools([{ name: "addTable", description: "d", input_schema: { type: "object" } }]);
    expect(out[0]).toEqual({ type: "function", function: { name: "addTable", description: "d", parameters: { type: "object" } } });
  });
});

describe("OpenAiProvider.streamTurn", () => {
  beforeEach(() => {
    createMock = vi.fn();
  });

  it("텍스트 델타를 누적·전달하고, 조각난 tool_call 델타를 index별로 합치며, length finish는 truncated로 표시한다", async () => {
    createMock.mockResolvedValue(chunkStream([
      { choices: [] }, // choices가 빈 청크는 무시
      { choices: [{ delta: { content: "안녕" } }] },
      { choices: [{ delta: { content: "하세요" } }] },
      // tool_call 인자가 두 청크에 걸쳐 쪼개져 도착
      { choices: [{ delta: { tool_calls: [{ index: 0, id: "call_1", function: { name: "addTable", arguments: '{"na' } }] } }] },
      {
        choices: [{
          delta: {
            tool_calls: [
              { index: 0, function: { arguments: 'me":"users"}' } },
              { index: 1, id: "call_2", function: { name: "listTables" } }, // 인자 없는 호출 → "{}"
            ],
          },
        }],
      },
      { choices: [{ delta: {}, finish_reason: "length" }] },
    ]));

    const messages: ConvMessage[] = [
      { role: "user", content: "users 테이블 만들어줘" },
      { role: "assistant", text: "", toolCalls: [{ id: "t0", name: "listTables", input: {} }] },
      { role: "tool", results: [{ toolCallId: "t0", toolName: "listTables", content: "[]" }] },
      { role: "assistant", text: "확인했어요", toolCalls: [] },
    ];
    const onText = vi.fn();
    const provider = new OpenAiProvider();
    const turn = await provider.streamTurn({ apiKey: "k", model: "gpt-4o", system: "sys", messages, tools, maxTokens: 100, onText });

    expect(turn.text).toBe("안녕하세요");
    expect(onText).toHaveBeenCalledWith("안녕");
    expect(onText).toHaveBeenCalledWith("하세요");
    expect(turn.truncated).toBe(true);
    expect(turn.toolCalls).toEqual([
      { id: "call_1", name: "addTable", input: { name: "users" } },
      { id: "call_2", name: "listTables", input: {} },
    ]);

    // 요청 파라미터: 구모델은 max_tokens, 스트리밍, 메시지 변환(system/assistant tool_calls/tool 결과)
    const req = createMock.mock.calls[0]![0] as Record<string, unknown>;
    expect(req["model"]).toBe("gpt-4o");
    expect(req["max_tokens"]).toBe(100);
    expect(req).not.toHaveProperty("max_completion_tokens");
    expect(req["stream"]).toBe(true);
    const sent = req["messages"] as Record<string, unknown>[];
    expect(sent[0]).toEqual({ role: "system", content: "sys" });
    expect(sent[1]).toEqual({ role: "user", content: "users 테이블 만들어줘" });
    expect(sent[2]).toEqual({
      role: "assistant",
      content: null, // 빈 텍스트는 null로
      tool_calls: [{ id: "t0", type: "function", function: { name: "listTables", arguments: "{}" } }],
    });
    expect(sent[3]).toEqual({ role: "tool", tool_call_id: "t0", content: "[]" });
    expect(sent[4]).toEqual({ role: "assistant", content: "확인했어요" });
  });

  it("gpt-5 계열 모델은 max_completion_tokens를 쓰고, 정상 종료 시 truncated=false", async () => {
    createMock.mockResolvedValue(chunkStream([
      { choices: [{ delta: { content: "hi" } }] },
      { choices: [{ delta: {}, finish_reason: "stop" }] },
    ]));

    const provider = new OpenAiProvider();
    const turn = await provider.streamTurn({
      apiKey: "k", model: "gpt-5.5-mini", system: "sys",
      messages: [{ role: "user", content: "hi" }], tools, maxTokens: 50, onText: vi.fn(),
    });

    expect(turn).toEqual({ text: "hi", toolCalls: [], truncated: false });
    const req = createMock.mock.calls[0]![0] as Record<string, unknown>;
    expect(req["max_completion_tokens"]).toBe(50);
    expect(req).not.toHaveProperty("max_tokens");
  });
});
