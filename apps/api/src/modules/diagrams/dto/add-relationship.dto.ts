import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";
import type { ReferentialAction, RelationshipCardinality } from "@erdify/domain";

export class AddRelationshipDto {
  @IsString()
  sourceEntityId!: string;

  @IsArray()
  @IsString({ each: true })
  sourceColumnIds!: string[];

  @IsString()
  targetEntityId!: string;

  @IsArray()
  @IsString({ each: true })
  targetColumnIds!: string[];

  @IsEnum(["one-to-one", "one-to-many", "many-to-one"])
  cardinality!: RelationshipCardinality;

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
