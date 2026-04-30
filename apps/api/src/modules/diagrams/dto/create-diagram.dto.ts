import { IsEnum, IsObject, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export type DiagramDialect = "postgresql" | "mysql" | "mariadb";

export class CreateDiagramDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsEnum(["postgresql", "mysql", "mariadb"])
  dialect!: DiagramDialect;

  @IsOptional()
  @IsObject()
  content?: object;
}
