import { randomUUID } from "crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Organization, OrganizationMember } from "@erdify/db";
import { Repository } from "typeorm";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { InviteMemberDto } from "./dto/invite-member.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(OrganizationMember)
    private readonly memberRepo: Repository<OrganizationMember>
  ) {}

  async create(userId: string, dto: CreateOrganizationDto): Promise<Organization> {
    const org = this.orgRepo.create({ id: randomUUID(), name: dto.name, ownerId: userId });
    const saved = await this.orgRepo.save(org);
    await this.memberRepo.save(
      this.memberRepo.create({ organizationId: saved.id, userId, role: "owner" })
    );
    return saved;
  }

  async findOne(orgId: string, userId: string): Promise<Organization> {
    const membership = await this.memberRepo.findOne({ where: { organizationId: orgId, userId } });
    if (!membership) throw new ForbiddenException();
    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (!org) throw new NotFoundException("Organization not found");
    return org;
  }

  async update(orgId: string, userId: string, dto: UpdateOrganizationDto): Promise<Organization> {
    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (!org) throw new NotFoundException("Organization not found");
    if (org.ownerId !== userId) throw new ForbiddenException();
    Object.assign(org, dto);
    return this.orgRepo.save(org);
  }

  async remove(orgId: string, userId: string): Promise<void> {
    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (!org) throw new NotFoundException("Organization not found");
    if (org.ownerId !== userId) throw new ForbiddenException();
    await this.orgRepo.remove(org);
  }

  async inviteMember(
    orgId: string,
    requesterId: string,
    dto: InviteMemberDto
  ): Promise<OrganizationMember> {
    const requesterMembership = await this.memberRepo.findOne({
      where: { organizationId: orgId, userId: requesterId }
    });
    if (!requesterMembership || requesterMembership.role === "viewer") {
      throw new ForbiddenException();
    }
    const existing = await this.memberRepo.findOne({
      where: { organizationId: orgId, userId: dto.userId }
    });
    if (existing) throw new ConflictException("User is already a member");
    return this.memberRepo.save(
      this.memberRepo.create({ organizationId: orgId, userId: dto.userId, role: dto.role })
    );
  }

  async removeMember(orgId: string, requesterId: string, targetUserId: string): Promise<void> {
    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (!org) throw new NotFoundException("Organization not found");
    if (org.ownerId !== requesterId) throw new ForbiddenException();
    if (targetUserId === requesterId) throw new BadRequestException("Cannot remove yourself as owner");
    const member = await this.memberRepo.findOne({
      where: { organizationId: orgId, userId: targetUserId }
    });
    if (!member) throw new NotFoundException("Member not found");
    await this.memberRepo.remove(member);
  }
}
