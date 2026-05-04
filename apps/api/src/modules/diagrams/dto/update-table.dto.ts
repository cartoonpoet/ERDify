import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateTableDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  color?: string | null;

  @IsOptional()
  comment?: string | null;
}
