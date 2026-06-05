export type AiProviderId = "anthropic" | "openai" | "gemini";

export interface AiModelOption {
  provider: AiProviderId;
  value: string;
  label: string;
}

/** 단일 소스: 백엔드(provider 역추론·검증)와 프론트(목록 표시)가 공유한다. */
export const AI_MODELS: AiModelOption[] = [
  { provider: "anthropic", value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (권장)" },
  { provider: "anthropic", value: "claude-opus-4-6", label: "Claude Opus 4.6 (고성능)" },
  { provider: "anthropic", value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (저비용)" },
  { provider: "openai", value: "gpt-4o", label: "GPT-4o (권장)" },
  { provider: "openai", value: "gpt-4o-mini", label: "GPT-4o mini (저비용)" },
  { provider: "openai", value: "gpt-4.1", label: "GPT-4.1" },
  { provider: "openai", value: "gpt-4.1-mini", label: "GPT-4.1 mini" },
  { provider: "openai", value: "gpt-4.1-nano", label: "GPT-4.1 nano" },
  { provider: "openai", value: "gpt-5.5", label: "GPT-5.5" },
  { provider: "openai", value: "gpt-5.5-mini", label: "GPT-5.5 mini" },
  { provider: "openai", value: "gpt-5.5-nano", label: "GPT-5.5 nano" },
  { provider: "openai", value: "gpt-5.4", label: "GPT-5.4" },
  { provider: "openai", value: "gpt-5.4-mini", label: "GPT-5.4 mini" },
  { provider: "openai", value: "gpt-5.4-nano", label: "GPT-5.4 nano" },
  { provider: "gemini", value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (권장)" },
  { provider: "gemini", value: "gemini-2.5-pro", label: "Gemini 2.5 Pro (고성능)" },
  { provider: "gemini", value: "gemini-2.0-flash", label: "Gemini 2.0 Flash (저비용)" },
];

export const AI_PROVIDERS: AiProviderId[] = ["anthropic", "openai", "gemini"];

export const PROVIDER_LABELS: Record<AiProviderId, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  gemini: "Gemini",
};

export const providerOfModel = (value: string): AiProviderId | null =>
  AI_MODELS.find((m) => m.value === value)?.provider ?? null;

export const modelsForProvider = (provider: AiProviderId): AiModelOption[] =>
  AI_MODELS.filter((m) => m.provider === provider);
