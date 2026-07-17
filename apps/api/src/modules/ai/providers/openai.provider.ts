import { Injectable } from "@nestjs/common";
import OpenAI from "openai";
import type { Tool } from "@anthropic-ai/sdk/resources";
import type { AiProvider, StreamTurnArgs, ProviderTurn, ConvMessage, NormalizedToolCall } from "./provider.types";

function toOpenAiMessages(system: string, messages: ConvMessage[]): OpenAI.ChatCompletionMessageParam[] {
  const out: OpenAI.ChatCompletionMessageParam[] = [{ role: "system", content: system }];
  for (const m of messages) {
    if (m.role === "user") {
      out.push({ role: "user", content: m.content });
      continue;
    }
    if (m.role === "assistant") {
      out.push({
        role: "assistant",
        content: m.text || null,
        ...(m.toolCalls.length
          ? { tool_calls: m.toolCalls.map((tc) => ({ id: tc.id, type: "function" as const, function: { name: tc.name, arguments: JSON.stringify(tc.input) } })) }
          : {}),
      });
      continue;
    }
    for (const r of m.results) out.push({ role: "tool", tool_call_id: r.toolCallId, content: r.content });
  }
  return out;
}

export function toOpenAiTools(tools: Tool[]): OpenAI.ChatCompletionTool[] {
  return tools.map((t) => ({
    type: "function" as const,
    function: { name: t.name, description: t.description ?? "", parameters: t.input_schema as Record<string, unknown> },
  }));
}

type ToolCallAcc = Map<number, { id: string; name: string; args: string }>;

/** 스트림 델타로 조각나 도착하는 tool_call을 index별로 누적한다. */
function accumulateToolCallDeltas(acc: ToolCallAcc, deltas: OpenAI.ChatCompletionChunk.Choice.Delta["tool_calls"]): void {
  for (const tc of deltas ?? []) {
    const cur = acc.get(tc.index) ?? { id: "", name: "", args: "" };
    if (tc.id) cur.id = tc.id;
    if (tc.function?.name) cur.name = tc.function.name;
    if (tc.function?.arguments) cur.args += tc.function.arguments;
    acc.set(tc.index, cur);
  }
}

@Injectable()
export class OpenAiProvider implements AiProvider {
  async streamTurn(args: StreamTurnArgs): Promise<ProviderTurn> {
    const client = new OpenAI({ apiKey: args.apiKey });
    const isNewModel = args.model.startsWith("gpt-5");
    const stream = await client.chat.completions.create({
      model: args.model,
      ...(isNewModel ? { max_completion_tokens: args.maxTokens } : { max_tokens: args.maxTokens }),
      tools: toOpenAiTools(args.tools),
      messages: toOpenAiMessages(args.system, args.messages),
      stream: true,
    });

    let text = "";
    let truncated = false;
    const acc: ToolCallAcc = new Map();
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (chunk.choices[0]?.finish_reason === "length") truncated = true;
      if (delta?.content) {
        text += delta.content;
        args.onText(delta.content);
      }
      accumulateToolCallDeltas(acc, delta?.tool_calls);
    }
    const toolCalls: NormalizedToolCall[] = [];
    for (const t of acc.values()) {
      try {
        toolCalls.push({ id: t.id, name: t.name, input: JSON.parse(t.args || "{}") as Record<string, unknown> });
      } catch {
        // 스트림이 중간에 끊겨(max token 등) tool_call 인자 JSON이 불완전한 경우:
        // 해당 호출은 버리고 truncated로 표시해 에이전트 루프의 이어가기 로직에 맡긴다
        truncated = true;
      }
    }
    return { text, toolCalls, truncated };
  }
}
