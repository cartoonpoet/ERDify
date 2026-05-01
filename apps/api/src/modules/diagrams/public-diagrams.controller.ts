import { Controller, Get, Param } from "@nestjs/common";
import { DiagramsService } from "./diagrams.service";

@Controller()
export class PublicDiagramsController {
  constructor(private readonly diagramsService: DiagramsService) {}

  @Get("diagrams/public/:shareToken")
  getPublic(@Param("shareToken") shareToken: string) {
    return this.diagramsService.getPublicDiagram(shareToken);
  }
}
