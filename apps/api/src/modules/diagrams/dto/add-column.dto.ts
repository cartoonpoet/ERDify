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
  nullable?: boolean = true;

  @IsOptional()
  @IsBoolean()
  primaryKey?: boolean = false;

  @IsOptional()
  @IsBoolean()
  unique?: boolean = false;

  @IsOptional()
  defaultValue?: string | null;

  @IsOptional()
  comment?: string | null;

  @IsOptional()
  @IsBoolean()
  autoIncrement?: boolean = false;
}
