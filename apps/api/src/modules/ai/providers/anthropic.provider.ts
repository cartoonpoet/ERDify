import { Injectable } from "@nestjs/common";
import Anthropic from "@anthropic-ai/sdk";
import type { AiProvider, StreamTurnArgs, ProviderTurn, ConvMessage } from "./provider.types";

function toAnthropicMessages(messages: ConvMessage[]): Anthropic.MessageParam[] {
  return messages.map((m): Anthropic.MessageParam => {
    if (m.role === "user") return { role: "user", content: m.content };
    if (m.role === "assistant") {
      const blocks: Anthropic.ContentBlockParam[] = [];
      if (m.text) blocks.push({ type: "text", text: m.text });
      for (const tc of m.toolCalls) blocks.push({ type: "tool_use", id: tc.id, name: tc.name, input: tc.input });
      return { role: "assistant", content: blocks.length ? blocks : "(no output)" };
    }
    return {
      role: "user",
      content: m.results.map((r) => ({ type: "tool_result" as const, tool_use_id: r.toolCallId, content: r.content })),
    };
  });
}

@Injectable()
export class AnthropicProvider implements AiProvider {
  async streamTurn(args: StreamTurnArgs): Promise<ProviderTurn> {
    const client = new Anthropic({ apiKey: args.apiKey });
    const stream = client.messages.stream({
      model: args.model,
      max_tokens: args.maxTokens,
      system: args.system,
      tools: args.tools,
      messages: toAnthropicMessages(args.messages),
    });
    stream.on("text", (delta: string) => args.onText(delta));
    const final = await stream.finalMessage();

    const text = final.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("");
    const toolCalls = final.content
      .filter((b) => b.type === "tool_use")
      .map((b) => {
        const t = b as { id: string; name: string; input: Record<string, unknown> };
        return { id: t.id, name: t.name, input: t.input };
      });
    return { text, toolCalls, truncated: final.stop_reason === "max_tokens" };
  }
}
