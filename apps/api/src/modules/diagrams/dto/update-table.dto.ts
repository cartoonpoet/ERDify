import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateTableDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  color?: string | null;

  @IsString()
  @IsOptional()
  comment?: string | null;
}
