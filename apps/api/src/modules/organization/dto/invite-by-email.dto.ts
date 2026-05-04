import { IsEmail, IsEnum } from "class-validator";
import type { MemberRole } from "@erdify/db";

export class InviteByEmailDto {
  @IsEmail()
  email!: string;

  @IsEnum(["owner", "editor", "viewer"])
  role!: MemberRole;
}
