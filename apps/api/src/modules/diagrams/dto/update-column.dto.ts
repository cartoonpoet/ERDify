import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

export class UpdateColumnDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  type?: string;

  @IsBoolean()
  @IsOptional()
  nullable?: boolean;

  @IsBoolean()
  @IsOptional()
  primaryKey?: boolean;

  @IsBoolean()
  @IsOptional()
  unique?: boolean;

  @IsString()
  @IsOptional()
  defaultValue?: string | null;

  @IsString()
  @IsOptional()
  comment?: string | null;
}
