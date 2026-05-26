import { z } from "zod";

export const aiChatRequestSchema = z.object({
  diagramId: z.string().min(1),
  message: z.string().min(1).max(2000),
});

export const aiSuggestColumnsRequestSchema = z.object({
  tableName: z.string().min(1).max(100),
  existingColumns: z.array(z.string()).max(50),
});

export const updateOrgAiSettingsRequestSchema = z.object({
  apiKey: z.string().min(1).max(200),
  provider: z.enum(["anthropic", "openai"]),
  model: z.string().max(60).default(""),
});

export type AiChatRequest = z.infer<typeof aiChatRequestSchema>;
export type AiSuggestColumnsRequest = z.infer<typeof aiSuggestColumnsRequestSchema>;
export type UpdateOrgAiSettingsRequest = z.infer<typeof updateOrgAiSettingsRequestSchema>;
