import { IsString, MaxLength, MinLength } from "class-validator";

export class RecordToolCallDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  tool!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  summary!: string;
}
