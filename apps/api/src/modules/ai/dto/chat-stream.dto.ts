import { IsString, MinLength, MaxLength, IsBoolean, IsOptional } from "class-validator";

export class AiChatStreamDto {
  @IsString()
  @MinLength(1)
  diagramId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message!: string;

  @IsBoolean()
  @IsOptional()
  enableReadTools?: boolean;
}
