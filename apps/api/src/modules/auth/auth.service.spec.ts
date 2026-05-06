import * as bcrypt from "bcryptjs";
import { ConflictException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import type { JwtService } from "@nestjs/jwt";
import type { ApiKey, Invite, OrganizationMember, User } from "@erdify/db";
import type { Repository } from "typeorm";
import { AuthService } from "./auth.service";

vi.mock("bcryptjs", () => ({
  hash: vi.fn(),
  compare: vi.fn()
}));

type MockRepo<T> = {
  findOne: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
};

describe("AuthService", () => {
  let service: AuthService;
  let userRepo: MockRepo<User>;
  let apiKeyRepo: MockRepo<ApiKey>;
  let inviteRepo: { find: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn> };
  let memberRepo: { findOne: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn> };
  let jwtService: { sign: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    userRepo = { findOne: vi.fn(), create: vi.fn(), save: vi.fn(), find: vi.fn(), count: vi.fn() };
    apiKeyRepo = { findOne: vi.fn(), create: vi.fn(), save: vi.fn(), find: vi.fn(), count: vi.fn() };
    inviteRepo = { find: vi.fn(), save: vi.fn() };
    memberRepo = { findOne: vi.fn().mockResolvedValue(null), create: vi.fn(), save: vi.fn() };
    jwtService = { sign: vi.fn() };
    service = new AuthService(
      userRepo as unknown as Repository<User>,
      apiKeyRepo as unknown as Repository<ApiKey>,
      inviteRepo as unknown as Repository<Invite>,
      memberRepo as unknown as Repository<OrganizationMember>,
      jwtService as unknown as JwtService
    );
  });

  describe("register", () => {
    it("throws ConflictException if email already exists", async () => {
      vi.mocked(userRepo.findOne).mockResolvedValue({ id: "1" } as User);
      await expect(
        service.register({ email: "a@b.com", password: "pass1234", name: "A" })
      ).rejects.toThrow(ConflictException);
    });

    it("hashes password and returns accessToken", async () => {
      vi.mocked(userRepo.findOne).mockResolvedValue(null);
      vi.mocked(userRepo.create).mockReturnValue({ id: "uuid", email: "a@b.com" } as User);
      vi.mocked(userRepo.save).mockResolvedValue({ id: "uuid", email: "a@b.com" } as User);
      vi.mocked(bcrypt.hash).mockResolvedValue("hashed" as never);
      vi.mocked(jwtService.sign).mockReturnValue("token");
      vi.mocked(inviteRepo.find).mockResolvedValue([]);

      const result = await service.register({ email: "a@b.com", password: "pass1234", name: "A" });

      expect(bcrypt.hash).toHaveBeenCalledWith("pass1234", 10);
      expect(result).toEqual({ accessToken: "token" });
    });

    it("auto-accepts pending invites on register", async () => {
      vi.mocked(userRepo.findOne).mockResolvedValue(null);
      vi.mocked(userRepo.create).mockReturnValue({ id: "new-user", email: "new@b.com" } as User);
      vi.mocked(userRepo.save).mockResolvedValue({ id: "new-user", email: "new@b.com" } as User);
      vi.mocked(bcrypt.hash).mockResolvedValue("hashed" as never);
      vi.mocked(jwtService.sign).mockReturnValue("token");

      const pendingInvite = { id: "inv-1", orgId: "org-1", email: "new@b.com", role: "editor", acceptedAt: null, expiresAt: new Date(Date.now() + 86400000) };
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
  });

  describe("login", () => {
    it("throws UnauthorizedException if user not found", async () => {
      vi.mocked(userRepo.findOne).mockResolvedValue(null);
      await expect(
        service.login({ email: "a@b.com", password: "pass1234" })
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException if password is invalid", async () => {
      vi.mocked(userRepo.findOne).mockResolvedValue({ id: "1", passwordHash: "hash" } as User);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
      await expect(
        service.login({ email: "a@b.com", password: "wrong" })
      ).rejects.toThrow(UnauthorizedException);
    });

    it("returns accessToken on valid credentials", async () => {
      vi.mocked(userRepo.findOne).mockResolvedValue({ id: "1", email: "a@b.com", passwordHash: "hash" } as User);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(jwtService.sign).mockReturnValue("token");

      const result = await service.login({ email: "a@b.com", password: "pass1234" });
      expect(result).toEqual({ accessToken: "token" });
    });
  });

  describe("generateApiKey", () => {
    it("auto-names key when no name is provided", async () => {
      vi.mocked(apiKeyRepo.count).mockResolvedValue(2);
      const saved = { id: "key-id", name: "API Key #3", prefix: "erd_abcdef012345", expiresAt: null, createdAt: new Date("2026-01-01") } as unknown as ApiKey;
      vi.mocked(apiKeyRepo.create).mockReturnValue(saved);
      vi.mocked(apiKeyRepo.save).mockResolvedValue(saved);

      const result = await service.generateApiKey("user-1", {});

      expect(result.apiKey).toMatch(/^erd_[a-f0-9]{64}$/);
      expect(result.name).toBe("API Key #3");
      expect(apiKeyRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user-1", name: "API Key #3" })
      );
    });

    it("uses provided name and does not call count", async () => {
      const saved = { id: "key-id", name: "Production", prefix: "erd_abcdef012345", expiresAt: null, createdAt: new Date("2026-01-01") } as unknown as ApiKey;
      vi.mocked(apiKeyRepo.create).mockReturnValue(saved);
      vi.mocked(apiKeyRepo.save).mockResolvedValue(saved);

      const result = await service.generateApiKey("user-1", { name: "Production" });

      expect(result.name).toBe("Production");
      expect(apiKeyRepo.count).not.toHaveBeenCalled();
    });

    it("stores expiresAt when provided", async () => {
      vi.mocked(apiKeyRepo.count).mockResolvedValue(0);
      const expiresAt = new Date("2026-12-31");
      const saved = { id: "key-id", name: "API Key #1", prefix: "erd_abc", expiresAt, createdAt: new Date() } as unknown as ApiKey;
      vi.mocked(apiKeyRepo.create).mockReturnValue(saved);
      vi.mocked(apiKeyRepo.save).mockResolvedValue(saved);

      const result = await service.generateApiKey("user-1", { expiresAt: "2026-12-31T00:00:00.000Z" });

      expect(apiKeyRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ expiresAt })
      );
      expect(result.expiresAt).toEqual(expiresAt);
    });
  });

  describe("regenerateApiKey", () => {
    it("throws NotFoundException if key not found or already revoked", async () => {
      vi.mocked(apiKeyRepo.findOne).mockResolvedValue(null);
      await expect(service.regenerateApiKey("user-1", "key-id")).rejects.toThrow(NotFoundException);
    });

    it("revokes existing key and returns new key with same name and expiresAt", async () => {
      const expiresAt = new Date("2026-12-31");
      const existing = { id: "key-id", userId: "user-1", name: "Production", expiresAt, revokedAt: null } as unknown as ApiKey;
      vi.mocked(apiKeyRepo.findOne).mockResolvedValue(existing);
      const newSaved = { id: "new-id", name: "Production", prefix: "erd_newprefix12", expiresAt, createdAt: new Date() } as unknown as ApiKey;
      vi.mocked(apiKeyRepo.create).mockReturnValue(newSaved);
      vi.mocked(apiKeyRepo.save)
        .mockResolvedValueOnce({ ...existing, revokedAt: new Date() } as unknown as ApiKey)
        .mockResolvedValueOnce(newSaved);

      const result = await service.regenerateApiKey("user-1", "key-id");

      expect(apiKeyRepo.save).toHaveBeenNthCalledWith(1, expect.objectContaining({ revokedAt: expect.any(Date) }));
      expect(result.apiKey).toMatch(/^erd_[a-f0-9]{64}$/);
      expect(result.name).toBe("Production");
      expect(result.expiresAt).toEqual(expiresAt);
    });
  });

  describe("validateApiKey", () => {
    it("returns null if key does not exist", async () => {
      vi.mocked(apiKeyRepo.findOne).mockResolvedValue(null);
      expect(await service.validateApiKey("erd_badkey")).toBeNull();
    });

    it("returns null if key is expired", async () => {
      vi.mocked(apiKeyRepo.findOne).mockResolvedValue({
        userId: "user-1",
        expiresAt: new Date(Date.now() - 1000),
        user: { email: "a@b.com" },
      } as unknown as ApiKey);

      expect(await service.validateApiKey("erd_expiredkey")).toBeNull();
    });

    it("returns JwtPayload if key is valid and not expired", async () => {
      vi.mocked(apiKeyRepo.findOne).mockResolvedValue({
        userId: "user-1",
        expiresAt: new Date(Date.now() + 86400000),
        user: { email: "a@b.com" },
      } as unknown as ApiKey);

      const result = await service.validateApiKey("erd_validkey");
      expect(result).toEqual({ sub: "user-1", email: "a@b.com" });
    });

    it("returns JwtPayload if key has no expiry (무기한)", async () => {
      vi.mocked(apiKeyRepo.findOne).mockResolvedValue({
        userId: "user-1",
        expiresAt: null,
        user: { email: "a@b.com" },
      } as unknown as ApiKey);

      const result = await service.validateApiKey("erd_noexpirykey");
      expect(result).toEqual({ sub: "user-1", email: "a@b.com" });
    });
  });
});
