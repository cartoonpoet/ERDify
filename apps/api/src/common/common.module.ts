import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrganizationMember } from "@erdify/db";
import { AuthorizationService } from "./services/authorization.service";

@Module({
  imports: [TypeOrmModule.forFeature([OrganizationMember])],
  providers: [AuthorizationService],
  exports: [AuthorizationService],
})
export class CommonModule {}
