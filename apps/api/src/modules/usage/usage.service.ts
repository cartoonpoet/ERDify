import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UsageLog } from "@erdify/db";
import { randomUUID } from "crypto";

@Injectable()
export class UsageService {
  constructor(
    @InjectRepository(UsageLog)
    private readonly usageLogRepo: Repository<UsageLog>,
  ) {}

  async log(
    organizationId: string,
    userId: string,
    eventType: string,
    resourceType?: string | null,
    resourceId?: string | null,
    meta?: Record<string, unknown> | null,
  ): Promise<void> {
    const entry = this.usageLogRepo.create({
      id: randomUUID(),
      organizationId,
      userId,
      eventType,
      resourceType: resourceType ?? null,
      resourceId: resourceId ?? null,
      meta: meta ?? null,
    });
    await this.usageLogRepo.save(entry);
  }
}
