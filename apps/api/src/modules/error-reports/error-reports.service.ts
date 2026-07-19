import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { randomUUID } from "node:crypto";
import { ErrorReport, type ErrorType } from "@erdify/db";
import { EmailService } from "../email/email.service";

export interface CreateErrorReportDto {
  errorType: ErrorType;
  httpStatus: number | null;
  path: string;
  url: string;
  userId: string | null;
  userAgent: string;
  pageName?: string | null;
  requestMethod?: string | null;
  requestBody?: string | null;
  requestParams?: string | null;
  responseBody?: string | null;
}

export interface ResolveDto {
  path: string;
  errorType: ErrorType;
  resolvedById: string;
  note?: string;
}

export interface GroupedErrorReport {
  errorType: ErrorType;
  path: string;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  resolved: boolean;
  occurrences: ErrorReport[];
}

@Injectable()
export class ErrorReportsService {
  private readonly logger = new Logger(ErrorReportsService.name);
  private lastSpikeAlertAt: Date | null = null;

  constructor(
    @InjectRepository(ErrorReport)
    private readonly repo: Repository<ErrorReport>,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreateErrorReportDto): Promise<void> {
    await this.repo.save({ ...dto, id: randomUUID() });

    if (dto.errorType === "5xx" || dto.errorType === "network") {
      const adminEmails = this.config.get<string>("ADMIN_EMAILS", "");
      await this.email.sendErrorAlertEmail({
        to: adminEmails,
        errorType: dto.errorType,
        httpStatus: dto.httpStatus,
        path: dto.path,
        userId: dto.userId,
        appUrl: this.config.get<string>("APP_URL", "http://localhost:5173"),
      });
    }
  }

  async findGrouped(filters: { type?: ErrorType; resolved?: boolean; from?: Date }): Promise<GroupedErrorReport[]> {
    const qb = this.repo.createQueryBuilder("r")
      .select(["r.errorType", "r.path"])
      .addSelect("COUNT(*)", "count")
      .addSelect("MIN(r.createdAt)", "firstSeen")
      .addSelect("MAX(r.createdAt)", "lastSeen")
      .addSelect("BOOL_AND(r.resolvedAt IS NOT NULL)", "resolved")
      .groupBy("r.errorType, r.path")
      .orderBy("MAX(r.createdAt)", "DESC");

    if (filters.type) qb.andWhere("r.errorType = :type", { type: filters.type });
    if (filters.resolved === false) qb.andWhere("r.resolvedAt IS NULL");
    if (filters.resolved === true) qb.andWhere("r.resolvedAt IS NOT NULL");
    if (filters.from) qb.andWhere("r.createdAt >= :from", { from: filters.from });

    const rows = await qb.getRawMany();
    return rows.map((row) => ({
      errorType: row.r_error_type as ErrorType,
      path: row.r_path,
      count: Number(row.count),
      firstSeen: new Date(row.firstSeen),
      lastSeen: new Date(row.lastSeen),
      resolved: row.resolved === true,
      occurrences: [],
    }));
  }

  async resolve(dto: ResolveDto): Promise<void> {
    await this.repo.update(
      { path: dto.path, errorType: dto.errorType, resolvedAt: IsNull() },
      { resolvedAt: new Date(), resolvedBy: dto.resolvedById, resolvedNote: dto.note ?? null },
    );
  }

  async getOccurrences(errorType: ErrorType, path: string): Promise<ErrorReport[]> {
    return this.repo.find({
      where: { errorType, path },
      order: { createdAt: "DESC" },
    });
  }

  async getStats(): Promise<Record<ErrorType, number>> {
    const counts = await Promise.all(
      (["5xx", "network", "403", "404"] as ErrorType[]).map(async (t) => ({
        type: t,
        count: await this.repo.count({ where: { errorType: t, resolvedAt: IsNull() } }),
      })),
    );
    return Object.fromEntries(counts.map((c) => [c.type, c.count])) as Record<ErrorType, number>;
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkSpikes(): Promise<void> {
    const threshold = this.config.get<number>("ERROR_SPIKE_THRESHOLD", 5);
    const since = new Date(Date.now() - 10 * 60 * 1000);

    for (const type of ["403", "404"] as ErrorType[]) {
      const count = await this.repo
        .createQueryBuilder("r")
        .where("r.errorType = :type", { type })
        .andWhere("r.createdAt >= :since", { since })
        .getCount();

      if (count >= threshold) {
        const cooldown = 30 * 60 * 1000;
        if (this.lastSpikeAlertAt && Date.now() - this.lastSpikeAlertAt.getTime() < cooldown) continue;

        const adminEmails = this.config.get<string>("ADMIN_EMAILS", "");
        await this.email.sendSpikeAlertEmail({
          to: adminEmails,
          errorType: type,
          count,
          appUrl: this.config.get<string>("APP_URL", "http://localhost:5173"),
        });
        this.lastSpikeAlertAt = new Date();
      }
    }
  }
}
