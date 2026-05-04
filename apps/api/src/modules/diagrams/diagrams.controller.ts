import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { FlexAuthGuard } from "../auth/guards/flex-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { JwtPayload } from "../auth/strategies/jwt.strategy";
import type { CreateDiagramDto } from "./dto/create-diagram.dto";
import type { UpdateDiagramDto } from "./dto/update-diagram.dto";
import { DiagramsService } from "./diagrams.service";
import type { ShareDiagramDto } from "./dto/share-diagram.dto";
import type { AddTableDto } from "./dto/add-table.dto";
import type { UpdateTableDto } from "./dto/update-table.dto";
import type { AddColumnDto } from "./dto/add-column.dto";
import type { UpdateColumnDto } from "./dto/update-column.dto";
import type { AddRelationshipDto } from "./dto/add-relationship.dto";
import type { UpdateRelationshipDto } from "./dto/update-relationship.dto";

@Controller()
@UseGuards(FlexAuthGuard)
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

  // Tables
  @Post("diagrams/:id/tables")
  @HttpCode(HttpStatus.CREATED)
  addTable(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: AddTableDto
  ) {
    return this.diagramsService.addTable(id, user.sub, dto);
  }

  @Patch("diagrams/:id/tables/:tableId")
  updateTable(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Param("tableId") tableId: string,
    @Body() dto: UpdateTableDto
  ) {
    return this.diagramsService.updateTable(id, tableId, user.sub, dto);
  }

  @Delete("diagrams/:id/tables/:tableId")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTable(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Param("tableId") tableId: string
  ) {
    return this.diagramsService.removeTable(id, tableId, user.sub);
  }

  // Columns
  @Post("diagrams/:id/tables/:tableId/columns")
  @HttpCode(HttpStatus.CREATED)
  addColumn(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Param("tableId") tableId: string,
    @Body() dto: AddColumnDto
  ) {
    return this.diagramsService.addColumn(id, tableId, user.sub, dto);
  }

  @Patch("diagrams/:id/tables/:tableId/columns/:columnId")
  updateColumn(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Param("tableId") tableId: string,
    @Param("columnId") columnId: string,
    @Body() dto: UpdateColumnDto
  ) {
    return this.diagramsService.updateColumn(id, tableId, columnId, user.sub, dto);
  }

  @Delete("diagrams/:id/tables/:tableId/columns/:columnId")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeColumn(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Param("tableId") tableId: string,
    @Param("columnId") columnId: string
  ) {
    return this.diagramsService.removeColumn(id, tableId, columnId, user.sub);
  }

  // Relationships
  @Post("diagrams/:id/relationships")
  @HttpCode(HttpStatus.CREATED)
  addRelationship(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: AddRelationshipDto
  ) {
    return this.diagramsService.addRelationship(id, user.sub, dto);
  }

  @Patch("diagrams/:id/relationships/:relId")
  updateRelationship(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Param("relId") relId: string,
    @Body() dto: UpdateRelationshipDto
  ) {
    return this.diagramsService.updateRelationship(id, relId, user.sub, dto);
  }

  @Delete("diagrams/:id/relationships/:relId")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeRelationship(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Param("relId") relId: string
  ) {
    return this.diagramsService.removeRelationship(id, relId, user.sub);
  }
}
