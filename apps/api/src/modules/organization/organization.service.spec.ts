import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException
} from "@nestjs/common";
import type { Invite, Organization, OrganizationMember, User } from "@erdify/db";
import type { Repository } from "typeorm";
import type { EmailService } from "../email/email.service";
import type { ConfigService } from "@nestjs/config";
import { OrganizationService } from "./organization.service";

type MockRepo<_T> = {
  findOne: ReturnType<typeof vi.fn>;
  find?: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
};

const makeOrg = (overrides: Partial<Organization> = {}): Organization =>
  ({ id: "org-1", name: "Acme", ownerId: "user-1", ...overrides }) as Organization;

const makeMember = (overrides: Partial<OrganizationMember> = {}): OrganizationMember =>
  ({ organizationId: "org-1", userId: "user-1", role: "owner", ...overrides }) as OrganizationMember;

describe("OrganizationService", () => {
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

  describe("create", () => {
    it("saves org and owner membership, returns org", async () => {
      const org = makeOrg();
      orgRepo.create.mockReturnValue(org);
      orgRepo.save.mockResolvedValue(org);
      memberRepo.create.mockReturnValue(makeMember());
      memberRepo.save.mockResolvedValue(makeMember());

      const result = await service.create("user-1", { name: "Acme" });
      expect(orgRepo.save).toHaveBeenCalled();
      expect(memberRepo.save).toHaveBeenCalled();
      expect(result).toEqual(org);
    });
  });

  describe("findOne", () => {
    it("throws ForbiddenException if not a member", async () => {
      memberRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne("org-1", "user-2")).rejects.toThrow(ForbiddenException);
    });

    it("throws NotFoundException if org missing", async () => {
      memberRepo.findOne.mockResolvedValue(makeMember());
      orgRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne("org-1", "user-1")).rejects.toThrow(NotFoundException);
    });

    it("returns org for member", async () => {
      const org = makeOrg();
      memberRepo.findOne.mockResolvedValue(makeMember());
      orgRepo.findOne.mockResolvedValue(org);
      const result = await service.findOne("org-1", "user-1");
      expect(result).toEqual(org);
    });
  });

  describe("update", () => {
    it("throws NotFoundException if org missing", async () => {
      orgRepo.findOne.mockResolvedValue(null);
      await expect(service.update("org-1", "user-1", { name: "New" })).rejects.toThrow(NotFoundException);
    });

    it("throws ForbiddenException if not owner", async () => {
      orgRepo.findOne.mockResolvedValue(makeOrg({ ownerId: "other" }));
      await expect(service.update("org-1", "user-1", { name: "New" })).rejects.toThrow(ForbiddenException);
    });

    it("updates and returns org", async () => {
      const org = makeOrg();
      orgRepo.findOne.mockResolvedValue(org);
      orgRepo.save.mockResolvedValue({ ...org, name: "New" });
      const result = await service.update("org-1", "user-1", { name: "New" });
      expect(result.name).toBe("New");
    });
  });

  describe("remove", () => {
    it("throws ForbiddenException if not owner", async () => {
      orgRepo.findOne.mockResolvedValue(makeOrg({ ownerId: "other" }));
      await expect(service.remove("org-1", "user-1")).rejects.toThrow(ForbiddenException);
    });

    it("removes org", async () => {
      const org = makeOrg();
      orgRepo.findOne.mockResolvedValue(org);
      orgRepo.remove.mockResolvedValue(undefined);
      await expect(service.remove("org-1", "user-1")).resolves.toBeUndefined();
      expect(orgRepo.remove).toHaveBeenCalledWith(org);
    });
  });

  describe("inviteMember", () => {
    it("throws ForbiddenException if requester is viewer", async () => {
      memberRepo.findOne.mockResolvedValueOnce(makeMember({ role: "viewer" }));
      await expect(
        service.inviteMember("org-1", "user-1", { userId: "user-2", role: "editor" })
      ).rejects.toThrow(ForbiddenException);
    });

    it("throws ConflictException if user already member", async () => {
      memberRepo.findOne.mockResolvedValueOnce(makeMember({ role: "owner" }));
      memberRepo.findOne.mockResolvedValueOnce(makeMember({ userId: "user-2" }));
      await expect(
        service.inviteMember("org-1", "user-1", { userId: "user-2", role: "editor" })
      ).rejects.toThrow(ConflictException);
    });

    it("creates and returns new membership", async () => {
      const newMember = makeMember({ userId: "user-2", role: "editor" });
      memberRepo.findOne.mockResolvedValueOnce(makeMember({ role: "owner" }));
      memberRepo.findOne.mockResolvedValueOnce(null);
      memberRepo.create.mockReturnValue(newMember);
      memberRepo.save.mockResolvedValue(newMember);
      const result = await service.inviteMember("org-1", "user-1", { userId: "user-2", role: "editor" });
      expect(result).toEqual(newMember);
    });
  });

  describe("removeMember", () => {
    it("throws ForbiddenException if not owner", async () => {
      orgRepo.findOne.mockResolvedValue(makeOrg({ ownerId: "other" }));
      await expect(service.removeMember("org-1", "user-1", "user-2")).rejects.toThrow(ForbiddenException);
    });

    it("throws BadRequestException if trying to remove self", async () => {
      orgRepo.findOne.mockResolvedValue(makeOrg());
      await expect(service.removeMember("org-1", "user-1", "user-1")).rejects.toThrow(BadRequestException);
    });

    it("throws NotFoundException if target not a member", async () => {
      orgRepo.findOne.mockResolvedValue(makeOrg());
      memberRepo.findOne.mockResolvedValue(null);
      await expect(service.removeMember("org-1", "user-1", "user-2")).rejects.toThrow(NotFoundException);
    });

    it("removes the member", async () => {
      const member = makeMember({ userId: "user-2" });
      orgRepo.findOne.mockResolvedValue(makeOrg());
      memberRepo.findOne.mockResolvedValue(member);
      memberRepo.remove.mockResolvedValue(undefined);
      await expect(service.removeMember("org-1", "user-1", "user-2")).resolves.toBeUndefined();
      expect(memberRepo.remove).toHaveBeenCalledWith(member);
    });
  });

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
      userRepo.findOne.mockResolvedValueOnce(null);
      inviteRepo.findOne.mockResolvedValue(null);
      inviteRepo.save.mockResolvedValue({});
      orgRepo.findOne.mockResolvedValue(makeOrg());
      userRepo.findOne.mockResolvedValueOnce({ id: "user-1", name: "Owner" });
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
      expect(result[0]!.email).toBe("x@x.com");
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
});
