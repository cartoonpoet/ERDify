import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class AddColumnDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  type!: string;

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
}
