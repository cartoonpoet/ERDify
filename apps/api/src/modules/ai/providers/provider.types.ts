import type { Tool } from "@anthropic-ai/sdk/resources";

export interface NormalizedToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export type ConvMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; text: string; toolCalls: NormalizedToolCall[] }
  | { role: "tool"; results: { toolCallId: string; toolName: string; content: string }[] };

export interface ProviderTurn {
  text: string;
  toolCalls: NormalizedToolCall[];
}

export interface StreamTurnArgs {
  apiKey: string;
  model: string;
  system: string;
  messages: ConvMessage[];
  tools: Tool[];
  maxTokens: number;
  onText: (delta: string) => void;
}

export interface AiProvider {
  streamTurn(args: StreamTurnArgs): Promise<ProviderTurn>;
}
