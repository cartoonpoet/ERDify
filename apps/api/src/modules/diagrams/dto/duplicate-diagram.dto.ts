import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class DuplicateDiagramDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(["postgresql", "mysql", "mariadb", "mssql"])
  dialect?: string;

  @IsOptional()
  @IsString()
  @IsUUID()
  targetProjectId?: string;
}
