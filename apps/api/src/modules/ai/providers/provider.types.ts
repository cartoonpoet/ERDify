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
  /** 출력 토큰 한도(max_tokens)에 걸려 응답이 중간에 잘렸으면 true. 끊긴 작업을 이어가기 위한 신호. */
  truncated: boolean;
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
