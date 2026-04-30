import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { JwtPayload } from "../auth/strategies/jwt.strategy";
import type { CreateOrganizationDto } from "./dto/create-organization.dto";
import type { InviteMemberDto } from "./dto/invite-member.dto";
import type { UpdateOrganizationDto } from "./dto/update-organization.dto";
import { OrganizationService } from "./organization.service";

@Controller("organizations")
@UseGuards(JwtAuthGuard)
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Get()
  findMyOrganizations(@CurrentUser() user: JwtPayload) {
    return this.organizationService.findMyOrganizations(user.sub);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateOrganizationDto) {
    return this.organizationService.create(user.sub, dto);
  }

  @Get(":id")
  findOne(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.organizationService.findOne(id, user.sub);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: UpdateOrganizationDto
  ) {
    return this.organizationService.update(id, user.sub, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.organizationService.remove(id, user.sub);
  }

  @Post(":id/members")
  inviteMember(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: InviteMemberDto
  ) {
    return this.organizationService.inviteMember(id, user.sub, dto);
  }

  @Delete(":id/members/:userId")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Param("userId") targetUserId: string
  ) {
    return this.organizationService.removeMember(id, user.sub, targetUserId);
  }
}
