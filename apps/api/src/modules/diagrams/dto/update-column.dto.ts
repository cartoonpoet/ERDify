import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

export class UpdateColumnDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  type?: string;

  @IsOptional()
  @IsBoolean()
  nullable?: boolean;

  @IsOptional()
  @IsBoolean()
  primaryKey?: boolean;

  @IsOptional()
  @IsBoolean()
  unique?: boolean;

  @IsOptional()
  defaultValue?: string | null;

  @IsOptional()
  comment?: string | null;
}
