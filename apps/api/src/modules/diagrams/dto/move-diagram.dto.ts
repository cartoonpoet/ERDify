import { IsString, IsUUID } from "class-validator";

export class MoveDiagramDto {
  @IsString()
  @IsUUID()
  targetProjectId!: string;
}
