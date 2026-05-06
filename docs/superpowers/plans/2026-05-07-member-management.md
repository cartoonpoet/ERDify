# Member Management & Invite System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 조직 멤버를 초대·조회·역할 변경·내보내기할 수 있는 전체 멤버 관리 기능을 추가하고, 미가입자에게는 pending invite를 통해 가입 후 자동 합류하도록 구현한다.

**Architecture:** DB에 `invites` 테이블 추가 → NestJS organization 모듈에 멤버 조회/역할 변경/초대 처리 로직 추가 → 회원가입 시 pending invite 자동 수락 → 프론트엔드 대시보드 사이드바에 "멤버 관리" 뷰 추가.

**Tech Stack:** NestJS (TypeORM, nodemailer), React (TanStack Query, vanilla-extract), TypeScript

---

## File Map

### Backend — 신규/수정
| 파일 | 역할 |
|------|------|
| `packages/db/src/entities/invite.entity.ts` | Invite TypeORM 엔티티 |
| `packages/db/src/migrations/1746000000012-CreateInvitesTable.ts` | invites 테이블 생성 마이그레이션 |
| `packages/db/src/entities/index.ts` | Invite 내보내기 추가 |
| `apps/api/src/modules/email/email.service.ts` | nodemailer 이메일 발송 서비스 |
| `apps/api/src/modules/email/email.module.ts` | EmailModule |
| `apps/api/src/app.module.ts` | EmailModule import 추가 |
| `apps/api/src/modules/organization/organization.module.ts` | Invite repo + EmailModule 추가 |
| `apps/api/src/modules/organization/organization.service.ts` | getMembers, updateMemberRole, inviteByEmail 수정, getPendingInvites, cancelInvite |
| `apps/api/src/modules/organization/organization.controller.ts` | GET/PATCH/GET/DELETE 신규 엔드포인트 |
| `apps/api/src/modules/organization/dto/update-member-role.dto.ts` | PATCH 역할 변경 DTO |
| `apps/api/src/modules/organization/organization.service.spec.ts` | 신규 메서드 테스트 추가 |
| `apps/api/src/modules/auth/auth.module.ts` | Invite, OrganizationMember repo 추가 |
| `apps/api/src/modules/auth/auth.service.ts` | register 시 pending invite 자동 수락 |
| `apps/api/src/modules/auth/auth.service.spec.ts` | auto-accept 테스트 추가 |

### Frontend — 신규/수정
| 파일 | 역할 |
|------|------|
| `apps/web/src/shared/api/members.api.ts` | 멤버/초대 CRUD API 함수 |
| `apps/web/src/features/dashboard/hooks/useMembers.ts` | 멤버 TanStack Query 훅 |
| `apps/web/src/features/dashboard/hooks/useInvites.ts` | 초대 TanStack Query 훅 |
| `apps/web/src/features/dashboard/components/InviteOrgModal.tsx` | 초대 모달 컴포넌트 |
| `apps/web/src/features/dashboard/components/invite-org-modal.css.ts` | 초대 모달 CSS |
| `apps/web/src/features/dashboard/pages/MemberManagementPage.tsx` | 멤버 관리 페이지 컴포넌트 |
| `apps/web/src/features/dashboard/pages/member-management-page.css.ts` | 멤버 관리 페이지 CSS |
| `apps/web/src/features/dashboard/components/UnifiedSidebar.tsx` | "👥 멤버 관리" 메뉴 추가 |
| `apps/web/src/features/dashboard/pages/DashboardPage.tsx` | memberManagementOpen 상태 + 렌더링 |
| `apps/web/src/features/auth/pages/RegisterPage.tsx` | inviteEmail query param 처리 |

---

## Task 1: Invite 엔티티 + 마이그레이션

**Files:**
- Create: `packages/db/src/entities/invite.entity.ts`
- Create: `packages/db/src/migrations/1746000000012-CreateInvitesTable.ts`
- Modify: `packages/db/src/entities/index.ts`

- [ ] **Step 1: invite.entity.ts 생성**

```typescript
// packages/db/src/entities/invite.entity.ts
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import type { Organization } from "./organization.entity";
import type { User } from "./user.entity";
import type { MemberRole } from "./organization-member.entity";

@Entity("invites")
export class Invite {
  @PrimaryColumn("varchar", { length: 36 })
  id!: string;

  @Column({ name: "org_id", length: 36 })
  orgId!: string;

  @Column({ length: 255 })
  email!: string;

  @Column({ type: "varchar", length: 20, default: "editor" })
  role!: MemberRole;

  @Column({ length: 36, unique: true })
  token!: string;

  @Column({ name: "invited_by_id", length: 36 })
  invitedById!: string;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt!: Date;

  @Column({ name: "accepted_at", type: "timestamptz", nullable: true })
  acceptedAt!: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @ManyToOne("Organization")
  @JoinColumn({ name: "org_id" })
  org!: Organization;

  @ManyToOne("User")
  @JoinColumn({ name: "invited_by_id" })
  invitedBy!: User;
}
```

- [ ] **Step 2: 마이그레이션 생성**

```typescript
// packages/db/src/migrations/1746000000012-CreateInvitesTable.ts
import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInvitesTable1746000000012 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE invites (
        id VARCHAR(36) PRIMARY KEY,
        org_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'editor',
        token VARCHAR(36) UNIQUE NOT NULL,
        invited_by_id VARCHAR(36) NOT NULL REFERENCES users(id),
        expires_at TIMESTAMPTZ NOT NULL,
        accepted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_invites_email_accepted ON invites (email, accepted_at)`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE invites`);
  }
}
```

- [ ] **Step 3: index.ts에 Invite 내보내기 추가**

`packages/db/src/entities/index.ts`의 기존 내용 끝에 추가:
```typescript
// 기존 exports 아래에 추가
export { Invite } from "./invite.entity";
```

최종 파일:
```typescript
export { ApiKey } from "./api-key.entity";
export { Diagram } from "./diagram.entity";
export { DiagramVersion } from "./diagram-version.entity";
export { Invite } from "./invite.entity";
export { OrganizationMember } from "./organization-member.entity";
export type { MemberRole } from "./organization-member.entity";
export { Organization } from "./organization.entity";
export { Project } from "./project.entity";
export { User } from "./user.entity";
```

- [ ] **Step 4: DB 패키지 빌드 확인**

```bash
cd /path/to/repo && pnpm --filter @erdify/db build
```

Expected: 오류 없이 빌드 완료

- [ ] **Step 5: 커밋**

```bash
git add packages/db/src/entities/invite.entity.ts \
        packages/db/src/migrations/1746000000012-CreateInvitesTable.ts \
        packages/db/src/entities/index.ts
git commit -m "feat(db): add Invite entity and migration"
```

---

## Task 2: Email 서비스

**Files:**
- Create: `apps/api/src/modules/email/email.service.ts`
- Create: `apps/api/src/modules/email/email.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: nodemailer 패키지 설치**

```bash
pnpm --filter @erdify/api add nodemailer
pnpm --filter @erdify/api add -D @types/nodemailer
```

Expected: package.json에 nodemailer 추가됨

- [ ] **Step 2: EmailService 작성**

```typescript
// apps/api/src/modules/email/email.service.ts
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

export interface InviteEmailParams {
  to: string;
  orgName: string;
  inviterName: string;
  role: string;
  inviteUrl: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get<string>("SMTP_HOST", "localhost"),
      port: config.get<number>("SMTP_PORT", 587),
      secure: config.get<boolean>("SMTP_SECURE", false),
      auth: {
        user: config.get<string>("SMTP_USER", ""),
        pass: config.get<string>("SMTP_PASS", ""),
      },
    });
  }

  async sendInviteEmail(params: InviteEmailParams): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.config.get<string>("SMTP_FROM", "noreply@erdify.app"),
        to: params.to,
        subject: `[ERDify] ${params.orgName} 조직에 초대되었습니다`,
        html: `
          <p>안녕하세요,</p>
          <p><strong>${params.inviterName}</strong>님이 <strong>${params.orgName}</strong> 조직에
          <strong>${params.role}</strong> 역할로 초대하셨습니다.</p>
          <p><a href="${params.inviteUrl}" style="background:#0064E0;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">ERDify에 가입하고 합류하기</a></p>
          <p style="color:#999;font-size:12px;">이 초대는 7일 후 만료됩니다.</p>
        `,
      });
    } catch (err) {
      this.logger.warn(`Failed to send invite email to ${params.to}: ${(err as Error).message}`);
    }
  }
}
```

- [ ] **Step 3: EmailModule 작성**

```typescript
// apps/api/src/modules/email/email.module.ts
import { Module } from "@nestjs/common";
import { EmailService } from "./email.service";

@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
```

- [ ] **Step 4: AppModule에 EmailModule import 추가**

`apps/api/src/app.module.ts`의 imports 배열에 `EmailModule` 추가:
```typescript
import { EmailModule } from "./modules/email/email.module";
// ... 기존 imports ...

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    DatabaseModule,
    AuthModule,
    OrganizationModule,
    ProjectModule,
    DiagramsModule,
    CollaborationModule,
    HealthModule,
    EmailModule,   // ← 추가
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
```

- [ ] **Step 5: 타입체크**

```bash
pnpm --filter @erdify/api typecheck
```

Expected: 오류 없음

- [ ] **Step 6: 커밋**

```bash
git add apps/api/src/modules/email/ apps/api/src/app.module.ts apps/api/package.json pnpm-lock.yaml
git commit -m "feat(api): add EmailService with nodemailer for invite emails"
```

---

## Task 3: 백엔드 — getMembers + updateMemberRole

**Files:**
- Create: `apps/api/src/modules/organization/dto/update-member-role.dto.ts`
- Modify: `apps/api/src/modules/organization/organization.module.ts`
- Modify: `apps/api/src/modules/organization/organization.service.ts`
- Modify: `apps/api/src/modules/organization/organization.controller.ts`
- Test: `apps/api/src/modules/organization/organization.service.spec.ts`

- [ ] **Step 1: 테스트 작성 (failing)**

`apps/api/src/modules/organization/organization.service.spec.ts`의 기존 describe 블록 끝 (마지막 `}` 전)에 추가:

```typescript
  describe("getMembers", () => {
    it("throws ForbiddenException if requester is not a member", async () => {
      memberRepo.findOne.mockResolvedValue(null);
      await expect(service.getMembers("org-1", "user-99")).rejects.toThrow(ForbiddenException);
    });

    it("returns member list with user info", async () => {
      memberRepo.findOne.mockResolvedValue(makeMember());
      memberRepo.find = vi.fn().mockResolvedValue([
        { ...makeMember(), user: { email: "a@b.com", name: "A" } },
        { ...makeMember({ userId: "user-2", role: "editor" }), user: { email: "b@b.com", name: "B" } },
      ]);
      const result = await service.getMembers("org-1", "user-1");
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ userId: "user-1", email: "a@b.com", role: "owner" });
    });
  });

  describe("updateMemberRole", () => {
    it("throws ForbiddenException if requester is not owner", async () => {
      orgRepo.findOne.mockResolvedValue(makeOrg({ ownerId: "other" }));
      await expect(service.updateMemberRole("org-1", "user-2", "editor", "user-1")).rejects.toThrow(ForbiddenException);
    });

    it("throws BadRequestException if trying to change own role", async () => {
      orgRepo.findOne.mockResolvedValue(makeOrg());
      await expect(service.updateMemberRole("org-1", "user-1", "editor", "user-1")).rejects.toThrow(BadRequestException);
    });

    it("throws NotFoundException if target not a member", async () => {
      orgRepo.findOne.mockResolvedValue(makeOrg());
      memberRepo.findOne.mockResolvedValue(null);
      await expect(service.updateMemberRole("org-1", "user-2", "editor", "user-1")).rejects.toThrow(NotFoundException);
    });

    it("updates and saves member role", async () => {
      const member = makeMember({ userId: "user-2", role: "viewer" });
      orgRepo.findOne.mockResolvedValue(makeOrg());
      memberRepo.findOne.mockResolvedValue(member);
      memberRepo.save.mockResolvedValue({ ...member, role: "editor" });
      await service.updateMemberRole("org-1", "user-2", "editor", "user-1");
      expect(memberRepo.save).toHaveBeenCalledWith(expect.objectContaining({ role: "editor" }));
    });
  });
```

또한 MockRepo 타입에 `find` 추가 (파일 상단):
```typescript
type MockRepo<_T> = {
  findOne: ReturnType<typeof vi.fn>;
  find?: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
};
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pnpm --filter @erdify/api test
```

Expected: FAIL — "service.getMembers is not a function"

- [ ] **Step 3: UpdateMemberRoleDto 생성**

```typescript
// apps/api/src/modules/organization/dto/update-member-role.dto.ts
import { IsEnum } from "class-validator";
import type { MemberRole } from "@erdify/db";

export class UpdateMemberRoleDto {
  @IsEnum(["owner", "editor", "viewer"])
  role!: MemberRole;
}
```

- [ ] **Step 4: OrganizationModule에 Invite + EmailModule 추가**

```typescript
// apps/api/src/modules/organization/organization.module.ts
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Invite, Organization, OrganizationMember, User } from "@erdify/db";
import { AuthModule } from "../auth/auth.module";
import { EmailModule } from "../email/email.module";
import { OrganizationController } from "./organization.controller";
import { OrganizationService } from "./organization.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, OrganizationMember, User, Invite]),
    AuthModule,
    EmailModule,
  ],
  controllers: [OrganizationController],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationModule {}
```

- [ ] **Step 5: OrganizationService에 getMembers + updateMemberRole 추가**

`apps/api/src/modules/organization/organization.service.ts` 상단 import 수정:
```typescript
import { randomUUID } from "crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Invite, Organization, OrganizationMember, User } from "@erdify/db";
import { IsNull, type Repository } from "typeorm";
import type { CreateOrganizationDto } from "./dto/create-organization.dto";
import type { InviteMemberDto } from "./dto/invite-member.dto";
import type { UpdateOrganizationDto } from "./dto/update-organization.dto";
import type { MemberRole } from "@erdify/db";
import type { EmailService } from "../email/email.service";
import { ConfigService } from "@nestjs/config";
```

생성자 수정:
```typescript
@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(OrganizationMember)
    private readonly memberRepo: Repository<OrganizationMember>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Invite)
    private readonly inviteRepo: Repository<Invite>,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}
```

`inviteByEmail` 메서드 바로 앞에 추가:
```typescript
  async getMembers(
    orgId: string,
    requesterId: string
  ): Promise<Array<{ userId: string; email: string; name: string; role: MemberRole; joinedAt: Date }>> {
    const membership = await this.memberRepo.findOne({ where: { organizationId: orgId, userId: requesterId } });
    if (!membership) throw new ForbiddenException();
    const members = await this.memberRepo.find({
      where: { organizationId: orgId },
      relations: ["user"],
      order: { joinedAt: "ASC" },
    });
    return members.map((m) => ({
      userId: m.userId,
      email: m.user.email,
      name: m.user.name,
      role: m.role,
      joinedAt: m.joinedAt,
    }));
  }

  async updateMemberRole(
    orgId: string,
    targetUserId: string,
    role: MemberRole,
    requesterId: string
  ): Promise<void> {
    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (!org) throw new NotFoundException("Organization not found");
    if (org.ownerId !== requesterId) throw new ForbiddenException("Only the owner can change member roles");
    if (targetUserId === requesterId) throw new BadRequestException("Cannot change your own role");
    const member = await this.memberRepo.findOne({ where: { organizationId: orgId, userId: targetUserId } });
    if (!member) throw new NotFoundException("Member not found");
    member.role = role;
    await this.memberRepo.save(member);
  }
```

- [ ] **Step 6: 컨트롤러에 GET /members + PATCH /members/:userId 추가**

`apps/api/src/modules/organization/organization.controller.ts`에 import 추가:
```typescript
import { UpdateMemberRoleDto } from "./dto/update-member-role.dto";
```

컨트롤러 클래스 내 `@Post(":id/members/invite")` 핸들러 바로 앞에 추가:
```typescript
  @Get(":id/members")
  getMembers(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.organizationService.getMembers(id, user.sub);
  }

  @Patch(":id/members/:userId")
  @HttpCode(HttpStatus.NO_CONTENT)
  updateMemberRole(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Param("userId") targetUserId: string,
    @Body() dto: UpdateMemberRoleDto
  ) {
    return this.organizationService.updateMemberRole(id, targetUserId, dto.role, user.sub);
  }
```

- [ ] **Step 7: 테스트 통과 확인**

```bash
pnpm --filter @erdify/api test
```

Expected: getMembers, updateMemberRole 테스트 PASS

- [ ] **Step 8: 커밋**

```bash
git add apps/api/src/modules/organization/
git commit -m "feat(api): add getMembers and updateMemberRole endpoints"
```

---

## Task 4: 백엔드 — inviteByEmail 수정 + pending invites CRUD

**Files:**
- Modify: `apps/api/src/modules/organization/organization.service.ts`
- Modify: `apps/api/src/modules/organization/organization.controller.ts`
- Test: `apps/api/src/modules/organization/organization.service.spec.ts`

- [ ] **Step 1: 테스트 작성 (failing)**

`organization.service.spec.ts`의 MockRepo 타입 상단에 `inviteRepo` 및 mock 추가:

beforeEach 블록 수정:
```typescript
  let service: OrganizationService;
  let orgRepo: MockRepo<Organization>;
  let memberRepo: MockRepo<OrganizationMember>;
  let userRepo: MockRepo<User>;
  let inviteRepo: {
    findOne: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  let emailService: { sendInviteEmail: ReturnType<typeof vi.fn> };
  let config: { get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    orgRepo = { findOne: vi.fn(), create: vi.fn(), save: vi.fn(), remove: vi.fn() };
    memberRepo = { findOne: vi.fn(), find: vi.fn(), create: vi.fn(), save: vi.fn(), remove: vi.fn() };
    userRepo = { findOne: vi.fn(), create: vi.fn(), save: vi.fn(), remove: vi.fn() };
    inviteRepo = { findOne: vi.fn(), find: vi.fn(), save: vi.fn(), remove: vi.fn() };
    emailService = { sendInviteEmail: vi.fn().mockResolvedValue(undefined) };
    config = { get: vi.fn((key: string, def?: string) => def ?? "") };
    service = new OrganizationService(
      orgRepo as unknown as Repository<Organization>,
      memberRepo as unknown as Repository<OrganizationMember>,
      userRepo as unknown as Repository<User>,
      inviteRepo as unknown as Repository<Invite>,
      emailService as unknown as EmailService,
      config as unknown as ConfigService
    );
  });
```

`inviteByEmail` 기존 테스트 블록을 아래로 교체 + pending invite 테스트 추가:
```typescript
  describe("inviteByEmail (registered user)", () => {
    it("throws ForbiddenException if requester is viewer", async () => {
      memberRepo.findOne.mockResolvedValue(makeMember({ role: "viewer" }));
      await expect(service.inviteByEmail("org-1", "requester", "a@b.com", "editor")).rejects.toThrow(ForbiddenException);
    });

    it("throws ConflictException if user is already a member", async () => {
      memberRepo.findOne
        .mockResolvedValueOnce(makeMember({ role: "owner" }))
        .mockResolvedValueOnce(makeMember({ userId: "user-2" }));
      userRepo.findOne.mockResolvedValue({ id: "user-2" });
      await expect(service.inviteByEmail("org-1", "user-1", "b@b.com", "editor")).rejects.toThrow(ConflictException);
    });

    it("adds registered user immediately and returns status:added", async () => {
      memberRepo.findOne
        .mockResolvedValueOnce(makeMember({ role: "owner" }))
        .mockResolvedValueOnce(null);
      userRepo.findOne.mockResolvedValue({ id: "user-2", email: "b@b.com" });
      memberRepo.create.mockReturnValue({ organizationId: "org-1", userId: "user-2", role: "editor" });
      memberRepo.save.mockResolvedValue({});
      const result = await service.inviteByEmail("org-1", "user-1", "b@b.com", "editor");
      expect(result).toEqual({ status: "added" });
    });
  });

  describe("inviteByEmail (unregistered user)", () => {
    it("creates pending invite and sends email, returns status:pending", async () => {
      memberRepo.findOne.mockResolvedValue(makeMember({ role: "owner" }));
      userRepo.findOne.mockResolvedValueOnce(null); // target not registered
      inviteRepo.findOne.mockResolvedValue(null);    // no existing invite
      inviteRepo.save.mockResolvedValue({});
      orgRepo.findOne.mockResolvedValue(makeOrg());
      userRepo.findOne.mockResolvedValueOnce({ id: "user-1", name: "Owner" }); // inviter lookup
      const result = await service.inviteByEmail("org-1", "user-1", "new@b.com", "editor");
      expect(result).toEqual({ status: "pending" });
      expect(inviteRepo.save).toHaveBeenCalled();
      expect(emailService.sendInviteEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: "new@b.com" })
      );
    });
  });

  describe("getPendingInvites", () => {
    it("throws ForbiddenException if requester is not a member", async () => {
      memberRepo.findOne.mockResolvedValue(null);
      await expect(service.getPendingInvites("org-1", "user-99")).rejects.toThrow(ForbiddenException);
    });

    it("returns pending invites", async () => {
      memberRepo.findOne.mockResolvedValue(makeMember());
      const invite = { id: "inv-1", orgId: "org-1", email: "x@x.com", role: "editor", acceptedAt: null };
      inviteRepo.find.mockResolvedValue([invite]);
      const result = await service.getPendingInvites("org-1", "user-1");
      expect(result).toHaveLength(1);
      expect(result[0].email).toBe("x@x.com");
    });
  });

  describe("cancelInvite", () => {
    it("throws ForbiddenException if requester is not owner", async () => {
      orgRepo.findOne.mockResolvedValue(makeOrg({ ownerId: "other" }));
      await expect(service.cancelInvite("org-1", "inv-1", "user-1")).rejects.toThrow(ForbiddenException);
    });

    it("throws NotFoundException if invite not found", async () => {
      orgRepo.findOne.mockResolvedValue(makeOrg());
      inviteRepo.findOne.mockResolvedValue(null);
      await expect(service.cancelInvite("org-1", "inv-1", "user-1")).rejects.toThrow(NotFoundException);
    });

    it("removes the invite", async () => {
      const invite = { id: "inv-1", orgId: "org-1" };
      orgRepo.findOne.mockResolvedValue(makeOrg());
      inviteRepo.findOne.mockResolvedValue(invite);
      inviteRepo.remove.mockResolvedValue(undefined);
      await service.cancelInvite("org-1", "inv-1", "user-1");
      expect(inviteRepo.remove).toHaveBeenCalledWith(invite);
    });
  });
```

또한 파일 상단 import에 추가:
```typescript
import type { Invite } from "@erdify/db";
import type { EmailService } from "./email.service"; // 경로 수정 불필요, 실제로는 ../email/email.service
import type { ConfigService } from "@nestjs/config";
```

실제 import 경로:
```typescript
import type { Invite, Organization, OrganizationMember, User } from "@erdify/db";
import { OrganizationService } from "./organization.service";
import type { EmailService } from "../email/email.service";
import type { ConfigService } from "@nestjs/config";
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pnpm --filter @erdify/api test
```

Expected: FAIL — inviteByEmail, getPendingInvites, cancelInvite 테스트 실패

- [ ] **Step 3: inviteByEmail 메서드 교체**

`apps/api/src/modules/organization/organization.service.ts`의 기존 `inviteByEmail` 메서드 전체를 아래로 교체:

```typescript
  async inviteByEmail(
    orgId: string,
    requesterId: string,
    email: string,
    role: MemberRole
  ): Promise<{ status: "added" | "pending" }> {
    const requesterMembership = await this.memberRepo.findOne({
      where: { organizationId: orgId, userId: requesterId },
    });
    if (!requesterMembership || requesterMembership.role === "viewer") {
      throw new ForbiddenException();
    }
    if (role === "owner" && requesterMembership.role !== "owner") {
      throw new ForbiddenException("Only owners can assign the owner role");
    }

    const user = await this.userRepo.findOne({ where: { email } });

    if (user) {
      const existing = await this.memberRepo.findOne({
        where: { organizationId: orgId, userId: user.id },
      });
      if (existing) throw new ConflictException("User is already a member");
      await this.memberRepo.save(
        this.memberRepo.create({ organizationId: orgId, userId: user.id, role })
      );
      return { status: "added" };
    }

    // 미가입자 — pending invite 생성
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const existingInvite = await this.inviteRepo.findOne({
      where: { orgId, email, acceptedAt: IsNull() },
    });

    if (existingInvite) {
      existingInvite.role = role;
      existingInvite.expiresAt = expiresAt;
      await this.inviteRepo.save(existingInvite);
    } else {
      await this.inviteRepo.save({
        id: randomUUID(),
        orgId,
        email,
        role,
        token: randomUUID(),
        invitedById: requesterId,
        expiresAt,
        acceptedAt: null,
      });
    }

    const [org, inviter] = await Promise.all([
      this.orgRepo.findOne({ where: { id: orgId } }),
      this.userRepo.findOne({ where: { id: requesterId } }),
    ]);
    const appUrl = this.config.get<string>("APP_URL", "https://erdify.app");
    await this.emailService.sendInviteEmail({
      to: email,
      orgName: org!.name,
      inviterName: inviter!.name,
      role,
      inviteUrl: `${appUrl}/register?inviteEmail=${encodeURIComponent(email)}`,
    });

    return { status: "pending" };
  }
```

- [ ] **Step 4: getPendingInvites + cancelInvite 추가**

`removeMember` 메서드 바로 뒤에 추가:
```typescript
  async getPendingInvites(orgId: string, requesterId: string): Promise<Invite[]> {
    const membership = await this.memberRepo.findOne({
      where: { organizationId: orgId, userId: requesterId },
    });
    if (!membership) throw new ForbiddenException();
    return this.inviteRepo.find({
      where: { orgId, acceptedAt: IsNull() },
      order: { createdAt: "ASC" },
    });
  }

  async cancelInvite(orgId: string, inviteId: string, requesterId: string): Promise<void> {
    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (!org) throw new NotFoundException("Organization not found");
    if (org.ownerId !== requesterId) throw new ForbiddenException();
    const invite = await this.inviteRepo.findOne({ where: { id: inviteId, orgId } });
    if (!invite) throw new NotFoundException("Invite not found");
    await this.inviteRepo.remove(invite);
  }
```

- [ ] **Step 5: 컨트롤러에 GET /invites + DELETE /invites/:inviteId 추가**

`apps/api/src/modules/organization/organization.controller.ts`의 `removeMember` 핸들러 뒤에 추가:
```typescript
  @Get(":id/invites")
  getPendingInvites(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.organizationService.getPendingInvites(id, user.sub);
  }

  @Delete(":id/invites/:inviteId")
  @HttpCode(HttpStatus.NO_CONTENT)
  cancelInvite(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Param("inviteId") inviteId: string
  ) {
    return this.organizationService.cancelInvite(id, inviteId, user.sub);
  }
```

- [ ] **Step 6: 테스트 통과 확인**

```bash
pnpm --filter @erdify/api test
```

Expected: 모든 테스트 PASS

- [ ] **Step 7: 커밋**

```bash
git add apps/api/src/modules/organization/
git commit -m "feat(api): modify inviteByEmail for pending invites, add invite CRUD endpoints"
```

---

## Task 5: 백엔드 — 회원가입 시 pending invite 자동 수락

**Files:**
- Modify: `apps/api/src/modules/auth/auth.module.ts`
- Modify: `apps/api/src/modules/auth/auth.service.ts`
- Test: `apps/api/src/modules/auth/auth.service.spec.ts`

- [ ] **Step 1: 테스트 작성 (failing)**

`apps/api/src/modules/auth/auth.service.spec.ts`에서:

MockRepo 타입에 `find` 이미 있음. `inviteRepo`, `memberRepo` mock 추가:

`beforeEach` 블록 수정:
```typescript
  let service: AuthService;
  let userRepo: MockRepo<User>;
  let apiKeyRepo: MockRepo<ApiKey>;
  let inviteRepo: MockRepo<Invite>;
  let memberRepo: { create: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn> };
  let jwtService: { sign: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    userRepo = { findOne: vi.fn(), create: vi.fn(), save: vi.fn(), find: vi.fn(), count: vi.fn() };
    apiKeyRepo = { findOne: vi.fn(), create: vi.fn(), save: vi.fn(), find: vi.fn(), count: vi.fn() };
    inviteRepo = { findOne: vi.fn(), create: vi.fn(), save: vi.fn(), find: vi.fn(), count: vi.fn() };
    memberRepo = { create: vi.fn(), save: vi.fn() };
    jwtService = { sign: vi.fn() };
    service = new AuthService(
      userRepo as unknown as Repository<User>,
      apiKeyRepo as unknown as Repository<ApiKey>,
      inviteRepo as unknown as Repository<Invite>,
      memberRepo as unknown as Repository<OrganizationMember>,
      jwtService as unknown as JwtService
    );
  });
```

파일 상단 import에 추가:
```typescript
import type { Invite, OrganizationMember } from "@erdify/db";
```

`register` describe 블록에 auto-accept 테스트 추가:
```typescript
    it("auto-accepts pending invites on register", async () => {
      vi.mocked(userRepo.findOne).mockResolvedValue(null);
      vi.mocked(userRepo.create).mockReturnValue({ id: "new-user", email: "new@b.com" } as User);
      vi.mocked(userRepo.save).mockResolvedValue({ id: "new-user", email: "new@b.com" } as User);
      vi.mocked(bcrypt.hash).mockResolvedValue("hashed" as never);
      vi.mocked(jwtService.sign).mockReturnValue("token");

      const pendingInvite = { id: "inv-1", orgId: "org-1", email: "new@b.com", role: "editor", acceptedAt: null };
      vi.mocked(inviteRepo.find).mockResolvedValue([pendingInvite] as unknown as Invite[]);
      vi.mocked(memberRepo.create).mockReturnValue({ organizationId: "org-1", userId: "new-user", role: "editor" } as OrganizationMember);
      vi.mocked(memberRepo.save).mockResolvedValue({} as OrganizationMember);
      vi.mocked(inviteRepo.save).mockResolvedValue({} as Invite);

      await service.register({ email: "new@b.com", password: "pass1234", name: "New" });

      expect(memberRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: "org-1", userId: "new-user", role: "editor" })
      );
      expect(inviteRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ acceptedAt: expect.any(Date) })
      );
    });
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pnpm --filter @erdify/api test
```

Expected: FAIL — auto-accept 테스트 실패

- [ ] **Step 3: AuthModule에 Invite + OrganizationMember 추가**

`apps/api/src/modules/auth/auth.module.ts`:
```typescript
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ApiKey, Invite, OrganizationMember, User } from "@erdify/db";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { FlexAuthGuard } from "./guards/flex-auth.guard";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, ApiKey, Invite, OrganizationMember]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>("JWT_SECRET");
        if (!secret) throw new Error("JWT_SECRET environment variable is required");
        return { secret, signOptions: { expiresIn: "7d" } };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, FlexAuthGuard],
  exports: [AuthService, JwtModule, FlexAuthGuard],
})
export class AuthModule {}
```

- [ ] **Step 4: AuthService에 inviteRepo + memberRepo 주입 + register 수정**

`apps/api/src/modules/auth/auth.service.ts` 상단 import 수정:
```typescript
import { createHash, randomBytes, randomUUID } from "crypto";
import { extname, join } from "path";
import { writeFile, unlink } from "fs/promises";
import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { ApiKey, Invite, OrganizationMember, User } from "@erdify/db";
import * as bcrypt from "bcryptjs";
import { IsNull, type Repository } from "typeorm";
import type { ChangePasswordDto } from "./dto/change-password.dto";
import type { CreateApiKeyDto } from "./dto/create-api-key.dto";
import type { LoginDto } from "./dto/login.dto";
import type { RegisterDto } from "./dto/register.dto";
import type { UpdateProfileDto } from "./dto/update-profile.dto";
import type { JwtPayload } from "./strategies/jwt.strategy";
```

생성자 수정:
```typescript
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(ApiKey)
    private readonly apiKeyRepo: Repository<ApiKey>,
    @InjectRepository(Invite)
    private readonly inviteRepo: Repository<Invite>,
    @InjectRepository(OrganizationMember)
    private readonly memberRepo: Repository<OrganizationMember>,
    private readonly jwtService: JwtService
  ) {}
```

`register` 메서드 수정:
```typescript
  async register(dto: RegisterDto): Promise<{ accessToken: string }> {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException("Email already registered");

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({ id: randomUUID(), email: dto.email, passwordHash, name: dto.name });
    const saved = await this.userRepo.save(user);

    // pending invite 자동 수락
    const pendingInvites = await this.inviteRepo.find({
      where: { email: dto.email, acceptedAt: IsNull() },
    });
    for (const invite of pendingInvites) {
      await this.memberRepo.save(
        this.memberRepo.create({ organizationId: invite.orgId, userId: saved.id, role: invite.role })
      );
      invite.acceptedAt = new Date();
      await this.inviteRepo.save(invite);
    }

    return { accessToken: this.jwtService.sign({ sub: saved.id, email: saved.email }) };
  }
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
pnpm --filter @erdify/api test
```

Expected: 모든 테스트 PASS

- [ ] **Step 6: 커밋**

```bash
git add apps/api/src/modules/auth/
git commit -m "feat(api): auto-accept pending invites on user registration"
```

---

## Task 6: 프론트엔드 — members.api.ts

**Files:**
- Create: `apps/web/src/shared/api/members.api.ts`

- [ ] **Step 1: members.api.ts 테스트 작성 (failing)**

```typescript
// apps/web/src/shared/api/members.api.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./httpClient", () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { httpClient } from "./httpClient";
import {
  getMembers, updateMemberRole, removeMember,
  inviteMemberByEmail, getPendingInvites, cancelInvite,
} from "./members.api";

describe("members.api", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getMembers calls GET /organizations/:id/members", async () => {
    vi.mocked(httpClient.get).mockResolvedValue({ data: [] });
    await getMembers("org-1");
    expect(httpClient.get).toHaveBeenCalledWith("/organizations/org-1/members");
  });

  it("updateMemberRole calls PATCH /organizations/:id/members/:userId", async () => {
    vi.mocked(httpClient.patch).mockResolvedValue({});
    await updateMemberRole("org-1", "user-2", "editor");
    expect(httpClient.patch).toHaveBeenCalledWith(
      "/organizations/org-1/members/user-2", { role: "editor" }
    );
  });

  it("inviteMemberByEmail calls POST and returns InviteResult", async () => {
    vi.mocked(httpClient.post).mockResolvedValue({ data: { status: "pending" } });
    const result = await inviteMemberByEmail("org-1", "x@x.com", "editor");
    expect(result).toEqual({ status: "pending" });
  });

  it("getPendingInvites calls GET /organizations/:id/invites", async () => {
    vi.mocked(httpClient.get).mockResolvedValue({ data: [] });
    await getPendingInvites("org-1");
    expect(httpClient.get).toHaveBeenCalledWith("/organizations/org-1/invites");
  });

  it("cancelInvite calls DELETE /organizations/:id/invites/:inviteId", async () => {
    vi.mocked(httpClient.delete).mockResolvedValue({});
    await cancelInvite("org-1", "inv-1");
    expect(httpClient.delete).toHaveBeenCalledWith("/organizations/org-1/invites/inv-1");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pnpm --filter @erdify/web test
```

Expected: FAIL — "Cannot find module './members.api'"

- [ ] **Step 3: members.api.ts 구현**

```typescript
// apps/web/src/shared/api/members.api.ts
import { httpClient } from "./httpClient";

export type MemberRoleType = "owner" | "editor" | "viewer";

export interface MemberInfo {
  userId: string;
  email: string;
  name: string;
  role: MemberRoleType;
  joinedAt: string;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: MemberRoleType;
  expiresAt: string;
  createdAt: string;
}

export interface InviteResult {
  status: "added" | "pending";
}

export const getMembers = (orgId: string): Promise<MemberInfo[]> =>
  httpClient.get<MemberInfo[]>(`/organizations/${orgId}/members`).then((r) => r.data);

export const updateMemberRole = (orgId: string, userId: string, role: MemberRoleType): Promise<void> =>
  httpClient.patch(`/organizations/${orgId}/members/${userId}`, { role }).then(() => undefined);

export const removeMember = (orgId: string, userId: string): Promise<void> =>
  httpClient.delete(`/organizations/${orgId}/members/${userId}`).then(() => undefined);

export const inviteMemberByEmail = (orgId: string, email: string, role: MemberRoleType): Promise<InviteResult> =>
  httpClient.post<InviteResult>(`/organizations/${orgId}/members/invite`, { email, role }).then((r) => r.data);

export const getPendingInvites = (orgId: string): Promise<PendingInvite[]> =>
  httpClient.get<PendingInvite[]>(`/organizations/${orgId}/invites`).then((r) => r.data);

export const cancelInvite = (orgId: string, inviteId: string): Promise<void> =>
  httpClient.delete(`/organizations/${orgId}/invites/${inviteId}`).then(() => undefined);
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pnpm --filter @erdify/web test
```

Expected: 5개 members.api 테스트 PASS

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/shared/api/members.api.ts apps/web/src/shared/api/members.api.test.ts
git commit -m "feat(web): add members.api for member and invite CRUD"
```

---

## Task 7: 프론트엔드 — useMembers + useInvites 훅

**Files:**
- Create: `apps/web/src/features/dashboard/hooks/useMembers.ts`
- Create: `apps/web/src/features/dashboard/hooks/useInvites.ts`

- [ ] **Step 1: useMembers 구현**

```typescript
// apps/web/src/features/dashboard/hooks/useMembers.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMembers, updateMemberRole, removeMember } from "../../../shared/api/members.api";
import type { MemberRoleType } from "../../../shared/api/members.api";

export const useMembers = (orgId: string) => {
  const queryClient = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members", orgId],
    queryFn: () => getMembers(orgId),
    enabled: !!orgId,
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: MemberRoleType }) =>
      updateMemberRole(orgId, userId, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["members", orgId] });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => removeMember(orgId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["members", orgId] });
    },
  });

  return {
    members,
    isLoading,
    updateRole: (userId: string, role: MemberRoleType) =>
      updateRoleMutation.mutate({ userId, role }),
    removeMember: (userId: string) => removeMemberMutation.mutate(userId),
  };
};
```

- [ ] **Step 2: useInvites 구현**

```typescript
// apps/web/src/features/dashboard/hooks/useInvites.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPendingInvites,
  inviteMemberByEmail,
  cancelInvite,
} from "../../../shared/api/members.api";
import type { InviteResult, MemberRoleType } from "../../../shared/api/members.api";

export const useInvites = (orgId: string) => {
  const queryClient = useQueryClient();

  const { data: invites = [], isLoading } = useQuery({
    queryKey: ["invites", orgId],
    queryFn: () => getPendingInvites(orgId),
    enabled: !!orgId,
  });

  const inviteMutation = useMutation({
    mutationFn: ({ email, role }: { email: string; role: MemberRoleType }) =>
      inviteMemberByEmail(orgId, email, role),
    onSuccess: (result: InviteResult) => {
      if (result.status === "added") {
        void queryClient.invalidateQueries({ queryKey: ["members", orgId] });
      }
      void queryClient.invalidateQueries({ queryKey: ["invites", orgId] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (inviteId: string) => cancelInvite(orgId, inviteId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invites", orgId] });
    },
  });

  return {
    invites,
    isLoading,
    invite: (email: string, role: MemberRoleType) =>
      inviteMutation.mutateAsync({ email, role }),
    cancelInvite: (inviteId: string) => cancelMutation.mutate(inviteId),
    isInviting: inviteMutation.isPending,
  };
};
```

- [ ] **Step 3: 타입체크**

```bash
pnpm --filter @erdify/web typecheck
```

Expected: 오류 없음

- [ ] **Step 4: 커밋**

```bash
git add apps/web/src/features/dashboard/hooks/
git commit -m "feat(web): add useMembers and useInvites TanStack Query hooks"
```

---

## Task 8: 프론트엔드 — InviteOrgModal

**Files:**
- Create: `apps/web/src/features/dashboard/components/InviteOrgModal.tsx`
- Create: `apps/web/src/features/dashboard/components/invite-org-modal.css.ts`

- [ ] **Step 1: 테스트 작성 (failing)**

```typescript
// apps/web/src/features/dashboard/components/InviteOrgModal.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("../hooks/useInvites", () => ({
  useInvites: vi.fn(),
}));
import { useInvites } from "../hooks/useInvites";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe("InviteOrgModal", () => {
  it("renders invite form when open", () => {
    vi.mocked(useInvites).mockReturnValue({
      invites: [], isLoading: false,
      invite: vi.fn(), cancelInvite: vi.fn(), isInviting: false,
    });
    const { default: InviteOrgModalModule } = await import("./InviteOrgModal");
    // dynamic import to avoid issues with module resolution
    render(<InviteOrgModalModule open orgId="org-1" onClose={vi.fn()} />, { wrapper });
    expect(screen.getByLabelText("이메일")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "초대 보내기" })).toBeInTheDocument();
  });

  it("calls invite and shows success result", async () => {
    const invite = vi.fn().mockResolvedValue({ status: "added" });
    vi.mocked(useInvites).mockReturnValue({
      invites: [], isLoading: false,
      invite, cancelInvite: vi.fn(), isInviting: false,
    });
    render(<InviteOrgModal open orgId="org-1" onClose={vi.fn()} />, { wrapper });
    fireEvent.change(screen.getByLabelText("이메일"), { target: { value: "a@b.com" } });
    fireEvent.click(screen.getByRole("button", { name: "초대 보내기" }));
    await waitFor(() => expect(invite).toHaveBeenCalledWith("a@b.com", "editor"));
    await waitFor(() => expect(screen.getByText("멤버로 추가되었습니다.")).toBeInTheDocument());
  });
});
```

Note: 위 테스트는 InviteOrgModal이 named export임을 가정. 아래 구현에서 named export로 작성.

- [ ] **Step 2: CSS 파일 생성**

```typescript
// apps/web/src/features/dashboard/components/invite-org-modal.css.ts
import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const label = style({
  display: "block",
  fontSize: vars.font.size.sm,
  fontWeight: vars.font.weight.medium,
  color: vars.color.textSecondary,
  marginBottom: vars.space["1"],
});

export const resultWrapper = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: vars.space["3"],
  padding: `${vars.space["5"]} 0 ${vars.space["3"]}`,
});

export const resultIcon = style({
  fontSize: "2rem",
});

export const resultText = style({
  fontSize: vars.font.size.md,
  color: vars.color.textPrimary,
  textAlign: "center",
});

export const resultFooter = style({
  display: "flex",
  justifyContent: "flex-end",
  gap: vars.space["2"],
  marginTop: vars.space["2"],
  width: "100%",
});
```

- [ ] **Step 3: InviteOrgModal 구현**

```tsx
// apps/web/src/features/dashboard/components/InviteOrgModal.tsx
import { useState, type FormEvent } from "react";
import { Modal, Button, Input } from "../../../design-system";
import { useInvites } from "../hooks/useInvites";
import { form, footer, selectInput } from "./modal-form.css";
import * as css from "./invite-org-modal.css";

interface InviteOrgModalProps {
  open: boolean;
  onClose: () => void;
  orgId: string;
}

export const InviteOrgModal = ({ open, onClose, orgId }: InviteOrgModalProps) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [result, setResult] = useState<"added" | "pending" | null>(null);
  const { invite, isInviting } = useInvites(orgId);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      const res = await invite(email.trim(), role);
      setResult(res.status);
      setEmail("");
    } catch {
      // 서버 에러는 조용히 처리 (추후 에러 state 추가 가능)
    }
  };

  const handleClose = () => {
    setEmail("");
    setResult(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="멤버 초대">
      {result ? (
        <div className={css.resultWrapper}>
          <div className={css.resultIcon}>{result === "added" ? "✓" : "✉"}</div>
          <div className={css.resultText}>
            {result === "added" ? "멤버로 추가되었습니다." : "가입 초대 메일을 보냈습니다."}
          </div>
          <div className={css.resultFooter}>
            <Button variant="secondary" size="md" onClick={() => setResult(null)}>
              추가 초대
            </Button>
            <Button variant="primary" size="md" onClick={handleClose}>
              닫기
            </Button>
          </div>
        </div>
      ) : (
        <form className={form} onSubmit={handleSubmit}>
          <Input
            id="invite-email"
            label="이메일"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <div>
            <label htmlFor="invite-role" className={css.label}>역할</label>
            <select
              id="invite-role"
              className={selectInput}
              value={role}
              onChange={(e) => setRole(e.target.value as "editor" | "viewer")}
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <div className={footer}>
            <Button variant="secondary" size="md" type="button" onClick={handleClose}>
              취소
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={isInviting || !email.trim()}
            >
              {isInviting ? "초대 중..." : "초대 보내기"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
```

- [ ] **Step 4: 타입체크**

```bash
pnpm --filter @erdify/web typecheck
```

Expected: 오류 없음

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/features/dashboard/components/InviteOrgModal.tsx \
        apps/web/src/features/dashboard/components/invite-org-modal.css.ts
git commit -m "feat(web): add InviteOrgModal component"
```

---

## Task 9: 프론트엔드 — MemberManagementPage

**Files:**
- Create: `apps/web/src/features/dashboard/pages/MemberManagementPage.tsx`
- Create: `apps/web/src/features/dashboard/pages/member-management-page.css.ts`

- [ ] **Step 1: CSS 파일 생성**

```typescript
// apps/web/src/features/dashboard/pages/member-management-page.css.ts
import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const page = style({
  padding: vars.space["6"],
  flex: 1,
  overflowY: "auto",
});

export const header = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: vars.space["6"],
});

export const title = style({
  fontSize: vars.font.size.lg,
  fontWeight: vars.font.weight.bold,
  color: vars.color.textPrimary,
  margin: 0,
});

export const subtitle = style({
  fontSize: vars.font.size.sm,
  color: vars.color.textSecondary,
  marginTop: vars.space["1"],
});

export const section = style({
  marginBottom: vars.space["6"],
});

export const sectionLabel = style({
  fontSize: vars.font.size["2xs"],
  fontWeight: vars.font.weight.bold,
  color: vars.color.textDisabled,
  letterSpacing: "0.7px",
  textTransform: "uppercase",
  marginBottom: vars.space["2"],
});

export const card = style({
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  overflow: "hidden",
  boxShadow: vars.shadow.sm,
});

export const memberRow = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["3"],
  padding: `${vars.space["3"]} ${vars.space["4"]}`,
  borderBottom: `1px solid ${vars.color.surfaceSecondary}`,
  selectors: { "&:last-child": { borderBottom: "none" } },
});

export const avatar = style({
  width: "32px",
  height: "32px",
  borderRadius: "50%",
  background: vars.color.primary,
  color: "#fff",
  fontSize: vars.font.size.sm,
  fontWeight: vars.font.weight.semibold,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

export const avatarPending = style({
  width: "32px",
  height: "32px",
  borderRadius: "50%",
  background: vars.color.surfaceSecondary,
  color: vars.color.textDisabled,
  fontSize: vars.font.size.md,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

export const memberInfo = style({
  flex: 1,
  minWidth: 0,
});

export const memberEmail = style({
  fontSize: vars.font.size.sm,
  fontWeight: vars.font.weight.medium,
  color: vars.color.textPrimary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const youBadge = style({
  fontSize: vars.font.size.xs,
  color: vars.color.textDisabled,
  display: "inline-block",
  marginLeft: vars.space["1"],
});

export const roleBadge = style({
  background: vars.color.surfaceSecondary,
  borderRadius: vars.radius.sm,
  padding: `${vars.space["1"]} ${vars.space["2"]}`,
  fontSize: vars.font.size.xs,
  fontWeight: vars.font.weight.semibold,
  color: vars.color.textSecondary,
  flexShrink: 0,
});

export const pendingBadge = style({
  background: vars.color.selectedBg,
  borderRadius: vars.radius.sm,
  padding: `${vars.space["1"]} ${vars.space["2"]}`,
  fontSize: vars.font.size.xs,
  fontWeight: vars.font.weight.medium,
  color: vars.color.primary,
  flexShrink: 0,
});

export const roleSelect = style({
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  padding: `${vars.space["1"]} ${vars.space["2"]}`,
  fontSize: vars.font.size.xs,
  color: vars.color.textPrimary,
  cursor: "pointer",
  outline: "none",
  fontFamily: vars.font.family,
  flexShrink: 0,
  selectors: { "&:focus": { borderColor: vars.color.primary } },
});

export const expiry = style({
  fontSize: vars.font.size.xs,
  color: vars.color.textDisabled,
  marginTop: "2px",
});

export const expiryExpired = style({
  fontSize: vars.font.size.xs,
  color: vars.color.error,
  marginTop: "2px",
});
```

- [ ] **Step 2: MemberManagementPage 구현**

```tsx
// apps/web/src/features/dashboard/pages/MemberManagementPage.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Skeleton } from "../../../design-system";
import { getMe } from "../../../shared/api/auth.api";
import { useMembers } from "../hooks/useMembers";
import { useInvites } from "../hooks/useInvites";
import { InviteOrgModal } from "../components/InviteOrgModal";
import * as css from "./member-management-page.css";

interface MemberManagementPageProps {
  orgId: string;
  orgName: string;
}

export const MemberManagementPage = ({ orgId, orgName }: MemberManagementPageProps) => {
  const [inviteOpen, setInviteOpen] = useState(false);
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const { members, isLoading: membersLoading, updateRole, removeMember } = useMembers(orgId);
  const { invites, isLoading: invitesLoading, cancelInvite } = useInvites(orgId);

  const myRole = members.find((m) => m.userId === me?.id)?.role ?? null;
  const isOwner = myRole === "owner";

  function formatExpiry(expiresAt: string): string {
    const diff = new Date(expiresAt).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days <= 0) return "만료됨";
    return `만료: ${days}일 후`;
  }

  function getInitial(email: string): string {
    return (email.split("@")[0]?.[0] ?? "?").toUpperCase();
  }

  return (
    <div className={css.page}>
      <div className={css.header}>
        <div>
          <h1 className={css.title}>멤버 관리</h1>
          <p className={css.subtitle}>{orgName}</p>
        </div>
        {isOwner && (
          <Button variant="primary" size="md" onClick={() => setInviteOpen(true)}>
            + 멤버 초대
          </Button>
        )}
      </div>

      <div className={css.section}>
        <div className={css.sectionLabel}>현재 멤버 · {members.length}명</div>
        <div className={css.card}>
          {membersLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={css.memberRow}>
                  <Skeleton width={32} height={32} style={{ borderRadius: "50%" }} />
                  <Skeleton width={180} height={14} />
                </div>
              ))
            : members.map((member) => (
                <div key={member.userId} className={css.memberRow}>
                  <div className={css.avatar}>{getInitial(member.email)}</div>
                  <div className={css.memberInfo}>
                    <div className={css.memberEmail}>
                      {member.email}
                      {member.userId === me?.id && (
                        <span className={css.youBadge}>나</span>
                      )}
                    </div>
                  </div>
                  {isOwner && member.userId !== me?.id ? (
                    <>
                      <select
                        className={css.roleSelect}
                        value={member.role}
                        aria-label={`${member.email} 역할`}
                        onChange={(e) =>
                          updateRole(member.userId, e.target.value as "owner" | "editor" | "viewer")
                        }
                      >
                        <option value="owner">Owner</option>
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (window.confirm(`${member.email}을 조직에서 내보내시겠습니까?`)) {
                            removeMember(member.userId);
                          }
                        }}
                      >
                        내보내기
                      </Button>
                    </>
                  ) : (
                    <div className={css.roleBadge}>
                      {member.role === "owner" ? "Owner" : member.role === "editor" ? "Editor" : "Viewer"}
                    </div>
                  )}
                </div>
              ))}
        </div>
      </div>

      {(invitesLoading || invites.length > 0) && (
        <div className={css.section}>
          <div className={css.sectionLabel}>대기 중인 초대 · {invites.length}개</div>
          <div className={css.card}>
            {invitesLoading
              ? Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className={css.memberRow}>
                    <Skeleton width={32} height={32} style={{ borderRadius: "50%" }} />
                    <Skeleton width={180} height={14} />
                  </div>
                ))
              : invites.map((invite) => {
                  const expiry = formatExpiry(invite.expiresAt);
                  return (
                    <div key={invite.id} className={css.memberRow}>
                      <div className={css.avatarPending}>✉</div>
                      <div className={css.memberInfo}>
                        <div className={css.memberEmail}>{invite.email}</div>
                        <div className={expiry === "만료됨" ? css.expiryExpired : css.expiry}>
                          {expiry}
                        </div>
                      </div>
                      <div className={css.pendingBadge}>
                        {invite.role === "editor" ? "Editor" : "Viewer"} · 대기중
                      </div>
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelInvite(invite.id)}
                        >
                          취소
                        </Button>
                      )}
                    </div>
                  );
                })}
          </div>
        </div>
      )}

      <InviteOrgModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        orgId={orgId}
      />
    </div>
  );
};
```

- [ ] **Step 3: 타입체크**

```bash
pnpm --filter @erdify/web typecheck
```

Expected: 오류 없음

- [ ] **Step 4: 커밋**

```bash
git add apps/web/src/features/dashboard/pages/MemberManagementPage.tsx \
        apps/web/src/features/dashboard/pages/member-management-page.css.ts
git commit -m "feat(web): add MemberManagementPage with member list, role change, and invite management"
```

---

## Task 10: 프론트엔드 — UnifiedSidebar + DashboardPage 연결 + RegisterPage 초대 이메일 처리

**Files:**
- Modify: `apps/web/src/features/dashboard/components/UnifiedSidebar.tsx`
- Modify: `apps/web/src/features/dashboard/pages/DashboardPage.tsx`
- Modify: `apps/web/src/features/auth/pages/RegisterPage.tsx`

- [ ] **Step 1: UnifiedSidebar에 멤버 관리 메뉴 추가**

`UnifiedSidebar.tsx`의 인터페이스에 props 추가:
```typescript
interface UnifiedSidebarProps {
  // ... 기존 props ...
  memberManagementActive: boolean;
  onManageMembers: () => void;
}
```

컴포넌트 시그니처 수정:
```typescript
export const UnifiedSidebar = ({
  orgs, selectedOrgId, onSelectOrg, onDeleteOrg, onCreateOrg,
  projects, selectedProjectId, onSelectProject, onDeleteProject, onCreateProject,
  diagrams, onCreateDiagram,
  memberManagementActive, onManageMembers,  // ← 추가
}: UnifiedSidebarProps) => {
```

`{selectedOrgId && (` 블록 안에서 `<div className={css.sidebarFooter}>` 바로 앞에 "관리" 섹션 추가:

```tsx
          <div className={css.treeSectionLabel} style={{ marginTop: "8px" }}>관리</div>
          <button
            className={[css.projRow, memberManagementActive ? css.projRowActive : ""].filter(Boolean).join(" ")}
            onClick={onManageMembers}
            aria-pressed={memberManagementActive}
          >
            <span className={css.projArrow} aria-hidden="true" />
            <span className={css.projIcon} aria-hidden="true">👥</span>
            <span className={css.projName}>멤버 관리</span>
          </button>
```

- [ ] **Step 2: DashboardPage에 memberManagementOpen 상태 추가**

`apps/web/src/features/dashboard/pages/DashboardPage.tsx`:

import 추가:
```typescript
import { MemberManagementPage } from "./MemberManagementPage";
```

상태 추가 (기존 `useState` 선언 블록에):
```typescript
  const [memberManagementOpen, setMemberManagementOpen] = useState(false);
```

`<UnifiedSidebar>` 컴포넌트에 props 추가:
```tsx
        <UnifiedSidebar
          // ... 기존 props ...
          memberManagementActive={memberManagementOpen}
          onManageMembers={() => setMemberManagementOpen(true)}
        />
```

`<DiagramGrid>` 렌더링 부분을 아래로 교체:
```tsx
        {memberManagementOpen && selectedOrganizationId ? (
          <MemberManagementPage
            orgId={selectedOrganizationId}
            orgName={orgs.find((o) => o.id === selectedOrganizationId)?.name ?? ""}
          />
        ) : (
          <DiagramGrid
            diagrams={diagrams}
            {...(selectedProject?.name ? { projectName: selectedProject.name } : {})}
            currentUserId={me?.id ?? null}
            onCreateDiagram={handleOpenDiagramModal}
            {...(selectedProjectId ? { onImportDiagram: handleOpenImportModal } : {})}
            onDeleteDiagram={handleDeleteDiagram}
            loading={diagramsLoading && !!selectedProjectId}
            {...(searchQuery ? { filterQuery: searchQuery } : {})}
          />
        )}
```

`selectOrganization` 핸들러 수정 (조직 변경 시 멤버 관리 뷰 닫기):
```typescript
  function handleSelectOrg(orgId: string) {
    selectOrganization(orgId);
    setMemberManagementOpen(false);
  }
```

`<UnifiedSidebar>`의 `onSelectOrg` prop을 `handleSelectOrg`로 교체:
```tsx
          onSelectOrg={handleSelectOrg}
```

- [ ] **Step 3: RegisterPage에 inviteEmail query param 처리**

`apps/web/src/features/auth/pages/RegisterPage.tsx` 수정:

import에 `useSearchParams` 추가:
```typescript
import { Link, useNavigate, useSearchParams } from "react-router-dom";
```

컴포넌트 내부 상단에 추가:
```typescript
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("inviteEmail") ?? "");
```

기존 `const [email, setEmail] = useState("");` 줄 제거.

- [ ] **Step 4: 타입체크**

```bash
pnpm --filter @erdify/web typecheck
```

Expected: 오류 없음

- [ ] **Step 5: 전체 웹 테스트 실행**

```bash
pnpm --filter @erdify/web test
```

Expected: 기존 테스트 포함 모두 PASS

- [ ] **Step 6: 전체 API 테스트 실행**

```bash
pnpm --filter @erdify/api test
```

Expected: 모두 PASS

- [ ] **Step 7: 커밋**

```bash
git add apps/web/src/features/dashboard/components/UnifiedSidebar.tsx \
        apps/web/src/features/dashboard/pages/DashboardPage.tsx \
        apps/web/src/features/auth/pages/RegisterPage.tsx
git commit -m "feat(web): integrate member management view into dashboard and handle invite email prefill"
```

---

## 완료 확인

- [ ] `pnpm --filter @erdify/api test` — 전체 PASS
- [ ] `pnpm --filter @erdify/web test` — 전체 PASS
- [ ] `pnpm --filter @erdify/api typecheck` — 오류 없음
- [ ] `pnpm --filter @erdify/web typecheck` — 오류 없음
