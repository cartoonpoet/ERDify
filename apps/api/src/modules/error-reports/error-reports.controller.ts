import { Body, Controller, Get, Patch, Post, Query, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ErrorReportsService, type CreateErrorReportDto, type ResolveDto } from "./error-reports.service";
import { ConfigService } from "@nestjs/config";
import type { ErrorType } from "@erdify/db";

@Controller("error-reports")
@UseGuards(JwtAuthGuard)
export class ErrorReportsController {
  constructor(
    private readonly service: ErrorReportsService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  async create(@Body() body: CreateErrorReportDto, @Req() req: { user: { id: string } }): Promise<void> {
    await this.service.create({ ...body, userId: req.user.id });
  }

  @Get()
  async findAll(
    @Req() req: { user: { email: string } },
    @Query("type") type?: ErrorType,
    @Query("resolved") resolved?: string,
    @Query("from") from?: string,
  ) {
    this.assertAdmin(req.user.email);
    const filters = {
      type,
      resolved: resolved === "true" ? true : resolved === "false" ? false : undefined,
      from: from ? new Date(from) : undefined,
    };
    const [groups, stats] = await Promise.all([
      this.service.findGrouped(filters),
      this.service.getStats(),
    ]);
    return { groups, stats };
  }

  @Patch("resolve")
  async resolve(@Body() body: { path: string; errorType: ErrorType; note?: string }, @Req() req: { user: { id: string; email: string } }): Promise<void> {
    this.assertAdmin(req.user.email);
    await this.service.resolve({ ...body, resolvedById: req.user.id });
  }

  private assertAdmin(email: string): void {
    const adminEmails = this.config.get<string>("ADMIN_EMAILS", "").split(",").map((e) => e.trim());
    if (!adminEmails.includes(email)) throw new UnauthorizedException();
  }
}
