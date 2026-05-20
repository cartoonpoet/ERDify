import { IsString, MinLength, MaxLength } from "class-validator";

export class AiChatDto {
  @IsString()
  @MinLength(1)
  diagramId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message!: string;
}
