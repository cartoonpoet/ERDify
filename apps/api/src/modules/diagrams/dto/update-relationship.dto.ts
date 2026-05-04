import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";
import type { ReferentialAction, RelationshipCardinality } from "@erdify/domain";

export class UpdateRelationshipDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sourceColumnIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetColumnIds?: string[];

  @IsOptional()
  @IsEnum(["one-to-one", "one-to-many", "many-to-one"])
  cardinality?: RelationshipCardinality;

  @IsOptional()
  @IsEnum(["cascade", "restrict", "set-null", "no-action"])
  onDelete?: ReferentialAction;

  @IsOptional()
  @IsEnum(["cascade", "restrict", "set-null", "no-action"])
  onUpdate?: ReferentialAction;

  @IsOptional()
  @IsBoolean()
  identifying?: boolean;
}
