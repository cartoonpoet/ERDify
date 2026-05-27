import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThanOrEqual, Or, IsNull, MoreThan } from "typeorm";
import { randomUUID } from "node:crypto";
import { Announcement } from "@erdify/db";
import type { AnnouncementResponse, CreateAnnouncementDto, UpdateAnnouncementDto } from "@erdify/contracts";

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement)
    private readonly repo: Repository<Announcement>,
  ) {}

  async findActive(): Promise<AnnouncementResponse[]> {
    const now = new Date();
    const rows = await this.repo.find({
      where: {
        startsAt: LessThanOrEqual(now),
        endsAt: Or(IsNull(), MoreThan(now)),
      },
      order: { createdAt: "ASC" },
    });
    return rows.map(this.toResponse);
  }

  async findAll(): Promise<AnnouncementResponse[]> {
    const rows = await this.repo.find({ order: { createdAt: "DESC" } });
    return rows.map(this.toResponse);
  }

  async create(dto: CreateAnnouncementDto, userId: string): Promise<AnnouncementResponse> {
    const saved = await this.repo.save({
      id: randomUUID(),
      title: dto.title,
      content: dto.content,
      type: dto.type,
      isUrgent: dto.isUrgent,
      startsAt: new Date(dto.startsAt),
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      createdBy: userId,
    });
    return this.toResponse(saved);
  }

  async update(id: string, dto: UpdateAnnouncementDto): Promise<AnnouncementResponse> {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException(`Announcement ${id} not found`);
    const saved = await this.repo.save({
      ...existing,
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.content !== undefined && { content: dto.content }),
      ...(dto.type !== undefined && { type: dto.type }),
      ...(dto.isUrgent !== undefined && { isUrgent: dto.isUrgent }),
      ...(dto.startsAt !== undefined && { startsAt: new Date(dto.startsAt) }),
      ...(dto.endsAt !== undefined && { endsAt: dto.endsAt ? new Date(dto.endsAt) : null }),
    });
    return this.toResponse(saved);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException(`Announcement ${id} not found`);
    await this.repo.delete(id);
  }

  private toResponse(a: Announcement): AnnouncementResponse {
    return {
      id: a.id,
      title: a.title,
      content: a.content,
      type: a.type,
      isUrgent: a.isUrgent,
      startsAt: a.startsAt.toISOString(),
      endsAt: a.endsAt ? a.endsAt.toISOString() : null,
      createdAt: a.createdAt.toISOString(),
    };
  }
}
