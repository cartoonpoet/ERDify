import { IsEnum, IsString } from "class-validator";
import type { MemberRole } from "@erdify/db";

export class InviteMemberDto {
  @IsString()
  userId!: string;

  @IsEnum(["owner", "editor", "viewer"])
  role!: MemberRole;
}
