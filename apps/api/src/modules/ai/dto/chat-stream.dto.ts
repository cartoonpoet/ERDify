import { IsString, MinLength, MaxLength, IsOptional } from "class-validator";

export class AiChatStreamDto {
  @IsString()
  @MinLength(1)
  diagramId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message!: string;

  @IsString()
  @IsOptional()
  @MaxLength(60)
  model?: string;
}
