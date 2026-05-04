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
import { FlexAuthGuard } from "../auth/guards/flex-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { JwtPayload } from "../auth/strategies/jwt.strategy";
import { CreateProjectDto } from "./dto/create-project.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";
import { ProjectService } from "./project.service";

@Controller("organizations/:orgId/projects")
@UseGuards(FlexAuthGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Param("orgId") orgId: string,
    @Body() dto: CreateProjectDto
  ) {
    return this.projectService.create(orgId, user.sub, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Param("orgId") orgId: string) {
    return this.projectService.findAll(orgId, user.sub);
  }

  @Get(":id")
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param("orgId") orgId: string,
    @Param("id") id: string
  ) {
    return this.projectService.findOne(orgId, id, user.sub);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: JwtPayload,
    @Param("orgId") orgId: string,
    @Param("id") id: string,
    @Body() dto: UpdateProjectDto
  ) {
    return this.projectService.update(orgId, id, user.sub, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: JwtPayload,
    @Param("orgId") orgId: string,
    @Param("id") id: string
  ) {
    return this.projectService.remove(orgId, id, user.sub);
  }
}
