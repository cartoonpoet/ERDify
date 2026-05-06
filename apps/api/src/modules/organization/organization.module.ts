import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Invite, Organization, OrganizationMember, User } from "@erdify/db";
import { AuthModule } from "../auth/auth.module";
import { EmailModule } from "../email/email.module";
import { OrganizationController } from "./organization.controller";
import { OrganizationService } from "./organization.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, OrganizationMember, User, Invite]),
    AuthModule,
    EmailModule,
  ],
  controllers: [OrganizationController],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationModule {}
