import {
  Body, Controller, Delete, Get, Param, Patch, Post,
  Req, UnauthorizedException, UseGuards,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AnnouncementsService } from "./announcements.service";
import { AnnouncementsAiService } from "./announcements-ai.service";
import { User } from "@erdify/db";
import type {
  AnnouncementResponse,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  AiGenerateAnnouncementDto,
  AiRefineAnnouncementDto,
  AiAnnouncementResult,
} from "@erdify/contracts";

@Controller()
export class AnnouncementsController {
  constructor(
    private readonly service: AnnouncementsService,
    private readonly aiService: AnnouncementsAiService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // ── 공개 엔드포인트 ──────────────────────────────────
  @Get("announcements/active")
  async findActive(): Promise<AnnouncementResponse[]> {
    return this.service.findActive();
  }

  // ── 어드민 엔드포인트 ─────────────────────────────────
  @Get("admin/announcements")
  @UseGuards(JwtAuthGuard)
  async findAll(@Req() req: { user: { sub: string } }): Promise<AnnouncementResponse[]> {
    await this.assertAdmin(req.user.sub);
    return this.service.findAll();
  }

  @Post("admin/announcements")
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() body: CreateAnnouncementDto,
    @Req() req: { user: { sub: string } },
  ): Promise<AnnouncementResponse> {
    await this.assertAdmin(req.user.sub);
    return this.service.create(body, req.user.sub);
  }

  @Patch("admin/announcements/:id")
  @UseGuards(JwtAuthGuard)
  async update(
    @Param("id") id: string,
    @Body() body: UpdateAnnouncementDto,
    @Req() req: { user: { sub: string } },
  ): Promise<AnnouncementResponse> {
    await this.assertAdmin(req.user.sub);
    return this.service.update(id, body);
  }

  @Delete("admin/announcements/:id")
  @UseGuards(JwtAuthGuard)
  async remove(
    @Param("id") id: string,
    @Req() req: { user: { sub: string } },
  ): Promise<void> {
    await this.assertAdmin(req.user.sub);
    return this.service.remove(id);
  }

  @Post("admin/announcements/ai/generate")
  @UseGuards(JwtAuthGuard)
  async aiGenerate(
    @Body() body: AiGenerateAnnouncementDto,
    @Req() req: { user: { sub: string } },
  ): Promise<AiAnnouncementResult> {
    await this.assertAdmin(req.user.sub);
    return this.aiService.generate(body, req.user.sub);
  }

  @Post("admin/announcements/ai/refine")
  @UseGuards(JwtAuthGuard)
  async aiRefine(
    @Body() body: AiRefineAnnouncementDto,
    @Req() req: { user: { sub: string } },
  ): Promise<AiAnnouncementResult> {
    await this.assertAdmin(req.user.sub);
    return this.aiService.refine(body, req.user.sub);
  }

  private async assertAdmin(userId: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId }, select: ["isAdmin"] });
    if (!user?.isAdmin) throw new UnauthorizedException();
  }
}
