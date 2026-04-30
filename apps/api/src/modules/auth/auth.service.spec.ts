import * as bcrypt from "bcrypt";
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import type { JwtService } from "@nestjs/jwt";
import type { User } from "@erdify/db";
import type { Repository } from "typeorm";
import { AuthService } from "./auth.service";

vi.mock("bcrypt", () => ({
  hash: vi.fn(),
  compare: vi.fn()
}));

type MockRepo = {
  findOne: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
};

describe("AuthService", () => {
  let service: AuthService;
  let userRepo: MockRepo;
  let jwtService: { sign: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    userRepo = { findOne: vi.fn(), create: vi.fn(), save: vi.fn() };
    jwtService = { sign: vi.fn() };
    service = new AuthService(
      userRepo as unknown as Repository<User>,
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

      const result = await service.register({ email: "a@b.com", password: "pass1234", name: "A" });

      expect(bcrypt.hash).toHaveBeenCalledWith("pass1234", 10);
      expect(result).toEqual({ accessToken: "token" });
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
});
