import { Injectable } from "@nestjs/common";
import OpenAI from "openai";
import type { Tool } from "@anthropic-ai/sdk/resources";
import type { AiProvider, StreamTurnArgs, ProviderTurn, ConvMessage } from "./provider.types";

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

@Injectable()
export class OpenAiProvider implements AiProvider {
  async streamTurn(args: StreamTurnArgs): Promise<ProviderTurn> {
    const client = new OpenAI({ apiKey: args.apiKey });
    const isNewModel = /^gpt-5/.test(args.model);
    const stream = await client.chat.completions.create({
      model: args.model,
      ...(isNewModel ? { max_completion_tokens: args.maxTokens } : { max_tokens: args.maxTokens }),
      tools: toOpenAiTools(args.tools),
      messages: toOpenAiMessages(args.system, args.messages),
      stream: true,
    });

    let text = "";
    const acc = new Map<number, { id: string; name: string; args: string }>();
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) {
        text += delta.content;
        args.onText(delta.content);
      }
      for (const tc of delta?.tool_calls ?? []) {
        const cur = acc.get(tc.index) ?? { id: "", name: "", args: "" };
        if (tc.id) cur.id = tc.id;
        if (tc.function?.name) cur.name = tc.function.name;
        if (tc.function?.arguments) cur.args += tc.function.arguments;
        acc.set(tc.index, cur);
      }
    }
    const toolCalls = [...acc.values()].map((t) => ({ id: t.id, name: t.name, input: JSON.parse(t.args || "{}") as Record<string, unknown> }));
    return { text, toolCalls };
  }
}
