import { IsObject, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateDiagramDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsObject()
  content?: object;
}
