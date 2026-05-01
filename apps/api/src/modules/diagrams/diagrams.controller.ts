import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { JwtPayload } from "../auth/strategies/jwt.strategy";
import type { CreateDiagramDto } from "./dto/create-diagram.dto";
import type { UpdateDiagramDto } from "./dto/update-diagram.dto";
import { DiagramsService } from "./diagrams.service";
import type { ShareDiagramDto } from "./dto/share-diagram.dto";

@Controller()
@UseGuards(JwtAuthGuard)
export class DiagramsController {
  constructor(private readonly diagramsService: DiagramsService) {}

  @Post("projects/:projectId/diagrams")
  create(
    @CurrentUser() user: JwtPayload,
    @Param("projectId") projectId: string,
    @Body() dto: CreateDiagramDto
  ) {
    return this.diagramsService.create(projectId, user.sub, dto);
  }

  @Get("projects/:projectId/diagrams")
  findAll(@CurrentUser() user: JwtPayload, @Param("projectId") projectId: string) {
    return this.diagramsService.findAll(projectId, user.sub);
  }

  @Get("diagrams/:id")
  findOne(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.diagramsService.findOne(id, user.sub);
  }

  @Patch("diagrams/:id")
  update(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: UpdateDiagramDto) {
    return this.diagramsService.update(id, user.sub, dto);
  }

  @Post("diagrams/:id/versions")
  @HttpCode(HttpStatus.CREATED)
  saveVersion(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.diagramsService.saveVersion(id, user.sub);
  }

  @Get("diagrams/:id/versions")
  findVersions(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.diagramsService.findVersions(id, user.sub);
  }

  @Post("diagrams/:id/restore/:versionId")
  @HttpCode(HttpStatus.OK)
  restoreVersion(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Param("versionId") versionId: string
  ) {
    return this.diagramsService.restoreVersion(id, versionId, user.sub);
  }

  @Delete("diagrams/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.diagramsService.remove(id, user.sub);
  }

  @Post("diagrams/:id/share")
  shareLink(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: ShareDiagramDto
  ) {
    return this.diagramsService.generateShareLink(id, user.sub, dto.preset);
  }

  @Delete("diagrams/:id/share")
  @HttpCode(HttpStatus.NO_CONTENT)
  revokeLink(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.diagramsService.revokeShareLink(id, user.sub);
  }
}
