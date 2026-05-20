import { IsString, IsArray, MinLength, MaxLength } from "class-validator";

export class AiSuggestColumnsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  tableName!: string;

  @IsArray()
  existingColumns!: string[];
}
