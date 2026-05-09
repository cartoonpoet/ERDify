import { ForbiddenException } from "@nestjs/common";
import type { OrganizationMember } from "@erdify/db";
import type { Repository } from "typeorm";
import { AuthorizationService } from "./authorization.service";

type MockRepo = { findOne: ReturnType<typeof vi.fn> };

describe("AuthorizationService", () => {
  let service: AuthorizationService;
  let memberRepo: MockRepo;

  beforeEach(() => {
    memberRepo = { findOne: vi.fn() };
    service = new AuthorizationService(memberRepo as unknown as Repository<OrganizationMember>);
  });

  describe("requireMember", () => {
    it("throws ForbiddenException when not a member", async () => {
      memberRepo.findOne.mockResolvedValue(null);
      await expect(service.requireMember("org-1", "user-1")).rejects.toThrow(ForbiddenException);
    });

    it("returns membership when member exists", async () => {
      const member = { organizationId: "org-1", userId: "user-1", role: "editor" };
      memberRepo.findOne.mockResolvedValue(member);
      await expect(service.requireMember("org-1", "user-1")).resolves.toEqual(member);
    });
  });

  describe("requireEditorOrOwner", () => {
    it("throws ForbiddenException for viewer role", async () => {
      memberRepo.findOne.mockResolvedValue({ role: "viewer" });
      await expect(service.requireEditorOrOwner("org-1", "user-1")).rejects.toThrow(ForbiddenException);
    });

    it("resolves for editor role", async () => {
      memberRepo.findOne.mockResolvedValue({ role: "editor" });
      await expect(service.requireEditorOrOwner("org-1", "user-1")).resolves.toBeDefined();
    });

    it("resolves for owner role", async () => {
      memberRepo.findOne.mockResolvedValue({ role: "owner" });
      await expect(service.requireEditorOrOwner("org-1", "user-1")).resolves.toBeDefined();
    });
  });
});
