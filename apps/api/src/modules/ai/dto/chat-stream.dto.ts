import { IsString, IsOptional, MinLength, MaxLength } from "class-validator";

export class AiChatStreamDto {
  @IsString()
  @MinLength(1)
  diagramId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message!: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  model?: string;
}

export class AiCreateSessionDto {
  @IsString()
  @MinLength(1)
  diagramId!: string;
}

export interface AiSessionResponse {
  id: string;
  diagramId: string;
  name: string;
  createdAt: string;
}

export interface SessionMessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  diff: unknown;
  accepted: boolean | null;
  createdAt: string;
}

export interface SessionMessagesResponse {
  messages: SessionMessageItem[];
  hasMore: boolean;
}
