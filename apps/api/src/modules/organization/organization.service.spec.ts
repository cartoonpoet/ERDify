import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException
} from "@nestjs/common";
import type { Organization, OrganizationMember } from "@erdify/db";
import type { Repository } from "typeorm";
import { OrganizationService } from "./organization.service";

type MockRepo<T> = {
  findOne: ReturnType<typeof vi.fn>;
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

  beforeEach(() => {
    orgRepo = { findOne: vi.fn(), create: vi.fn(), save: vi.fn(), remove: vi.fn() };
    memberRepo = { findOne: vi.fn(), create: vi.fn(), save: vi.fn(), remove: vi.fn() };
    service = new OrganizationService(
      orgRepo as unknown as Repository<Organization>,
      memberRepo as unknown as Repository<OrganizationMember>
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
});
