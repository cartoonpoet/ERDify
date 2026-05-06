import { IsEnum } from "class-validator";
import type { MemberRole } from "@erdify/db";

export class UpdateMemberRoleDto {
  @IsEnum(["owner", "editor", "viewer"])
  role!: MemberRole;
}
