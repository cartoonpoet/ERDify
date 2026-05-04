import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";
import type { ReferentialAction, RelationshipCardinality } from "@erdify/domain";

export class UpdateRelationshipDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  sourceColumnIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetColumnIds?: string[];

  @IsEnum(["one-to-one", "one-to-many", "many-to-one"])
  @IsOptional()
  cardinality?: RelationshipCardinality;

  @IsEnum(["cascade", "restrict", "set-null", "no-action"])
  @IsOptional()
  onDelete?: ReferentialAction;

  @IsEnum(["cascade", "restrict", "set-null", "no-action"])
  @IsOptional()
  onUpdate?: ReferentialAction;

  @IsBoolean()
  @IsOptional()
  identifying?: boolean;
}
