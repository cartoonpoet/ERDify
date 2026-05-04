import { IsNumber, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class AddTableDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsNumber()
  @IsOptional()
  x?: number;

  @IsNumber()
  @IsOptional()
  y?: number;
}
