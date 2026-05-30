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
