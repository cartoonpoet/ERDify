import { ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { OrganizationMember } from "@erdify/db";
import type { Repository } from "typeorm";
import { Role } from "../enums/role.enum";

@Injectable()
export class AuthorizationService {
  constructor(
    @InjectRepository(OrganizationMember)
    private readonly memberRepo: Repository<OrganizationMember>
  ) {}

  async requireMember(orgId: string, userId: string): Promise<OrganizationMember> {
    const m = await this.memberRepo.findOne({ where: { organizationId: orgId, userId } });
    if (!m) throw new ForbiddenException();
    return m;
  }

  async requireEditorOrOwner(orgId: string, userId: string): Promise<OrganizationMember> {
    const m = await this.requireMember(orgId, userId);
    if (m.role === Role.Viewer) throw new ForbiddenException();
    return m;
  }
}
