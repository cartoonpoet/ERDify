import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

export class AddColumnDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  type!: string;

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
}
