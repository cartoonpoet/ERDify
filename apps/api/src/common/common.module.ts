import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrganizationMember } from "@erdify/db";
import { AuthorizationService } from "./services/authorization.service";
import { DomainLoaderService } from "./services/domain-loader.service";

@Module({
  imports: [TypeOrmModule.forFeature([OrganizationMember])],
  providers: [AuthorizationService, DomainLoaderService],
  exports: [AuthorizationService, DomainLoaderService],
})
export class CommonModule {}
