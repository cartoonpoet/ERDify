import { IsInt, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class AddTableDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsInt()
  x?: number;

  @IsOptional()
  @IsInt()
  y?: number;
}
