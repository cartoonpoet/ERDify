# API Key Management Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated `/settings/api-keys` page where users can list, create (with name + expiry), revoke, and regenerate API keys.

**Architecture:** Add `name`/`expiresAt` columns to the `ApiKey` entity via migration, extend the NestJS `AuthService`/`AuthController` with a `POST /auth/api-keys/:id/regenerate` endpoint, then build the React page using TanStack Query + vanilla-extract. The existing `ApiKeyModal` component is replaced by the new page.

**Tech Stack:** TypeORM (PostgreSQL), NestJS + class-validator, React + React Router, TanStack Query, vanilla-extract, vitest

---

## File Map

| File | Action |
|---|---|
| `packages/db/src/entities/api-key.entity.ts` | Modify — add `name`, `expiresAt` columns |
| `packages/db/src/migrations/1746000000011-AddNameExpiresAtToApiKeys.ts` | Create — migration |
| `apps/api/src/modules/auth/dto/create-api-key.dto.ts` | Create — DTO |
| `apps/api/src/modules/auth/auth.service.ts` | Modify — update `generateApiKey`, `listApiKeys`, `validateApiKey`; add `regenerateApiKey` |
| `apps/api/src/modules/auth/auth.service.spec.ts` | Modify — update + add tests |
| `apps/api/src/modules/auth/auth.controller.ts` | Modify — accept body on POST, add `POST /:id/regenerate` |
| `apps/web/src/shared/api/api-keys.api.ts` | Create — API client functions |
| `apps/web/src/shared/api/api-keys.api.test.ts` | Create — tests |
| `apps/web/src/shared/api/auth.api.ts` | Modify — remove `generateApiKey` |
| `apps/web/src/features/settings/pages/api-keys-page.css.ts` | Create — vanilla-extract styles |
| `apps/web/src/features/settings/pages/ApiKeysPage.tsx` | Create — page component |
| `apps/web/src/app/Router.tsx` | Modify — add `/settings/api-keys` route |
| `apps/web/src/features/dashboard/pages/DashboardPage.tsx` | Modify — dropdown navigate instead of modal |
| `apps/web/src/features/dashboard/components/ApiKeyModal.tsx` | Delete |
| `apps/web/src/features/dashboard/components/ApiKeyModal.css.ts` | Delete |

---

### Task 1: DB — Add name and expiresAt to ApiKey entity + migration

**Files:**
- Modify: `packages/db/src/entities/api-key.entity.ts`
- Create: `packages/db/src/migrations/1746000000011-AddNameExpiresAtToApiKeys.ts`

- [ ] **Step 1: Add columns to ApiKey entity**

Replace the contents of `packages/db/src/entities/api-key.entity.ts`:

```typescript
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { User } from "./user.entity";

@Entity("api_keys")
export class ApiKey {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ name: "user_id", type: "varchar", length: 36 })
  userId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ name: "key_hash", length: 64, unique: true })
  keyHash!: string;

  @Column({ length: 16 })
  prefix!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  name!: string | null;

  @Column({ name: "expires_at", type: "timestamptz", nullable: true })
  expiresAt!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @Column({ name: "revoked_at", nullable: true, type: "timestamptz" })
  revokedAt!: Date | null;
}
```

- [ ] **Step 2: Create migration file**

Create `packages/db/src/migrations/1746000000011-AddNameExpiresAtToApiKeys.ts`:

```typescript
import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddNameExpiresAtToApiKeys1746000000011 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "api_keys"
        ADD COLUMN IF NOT EXISTS "name"       VARCHAR(100),
        ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMPTZ
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "api_keys"
        DROP COLUMN IF EXISTS "name",
        DROP COLUMN IF EXISTS "expires_at"
    `);
  }
}
```

- [ ] **Step 3: Verify migration runs**

```bash
pnpm --filter @erdify/db migration:run
```

Expected: migration `AddNameExpiresAtToApiKeys1746000000011` runs successfully.

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/entities/api-key.entity.ts packages/db/src/migrations/1746000000011-AddNameExpiresAtToApiKeys.ts
git commit -m "feat(db): add name and expiresAt columns to api_keys"
```

---

### Task 2: API — Create DTO + Update AuthService (types + methods)

**Files:**
- Create: `apps/api/src/modules/auth/dto/create-api-key.dto.ts`
- Modify: `apps/api/src/modules/auth/auth.service.ts`

- [ ] **Step 1: Create CreateApiKeyDto first (service imports it)**

Create `apps/api/src/modules/auth/dto/create-api-key.dto.ts`:

```typescript
import { IsDateString, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateApiKeyDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
```

- [ ] **Step 2: Update interfaces and methods in auth.service.ts**

Replace the file contents of `apps/api/src/modules/auth/auth.service.ts` with the following (full file):

```typescript
import { createHash, randomBytes, randomUUID } from "crypto";
import { extname, join } from "path";
import { writeFile, unlink } from "fs/promises";
import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { ApiKey, User } from "@erdify/db";
import * as bcrypt from "bcryptjs";
import { IsNull, type Repository } from "typeorm";
import type { ChangePasswordDto } from "./dto/change-password.dto";
import type { CreateApiKeyDto } from "./dto/create-api-key.dto";
import type { LoginDto } from "./dto/login.dto";
import type { RegisterDto } from "./dto/register.dto";
import type { UpdateProfileDto } from "./dto/update-profile.dto";
import type { JwtPayload } from "./strategies/jwt.strategy";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface ApiKeyInfo {
  id: string;
  name: string | null;
  prefix: string;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface ApiKeyCreated {
  apiKey: string;
  id: string;
  name: string | null;
  prefix: string;
  expiresAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(ApiKey)
    private readonly apiKeyRepo: Repository<ApiKey>,
    private readonly jwtService: JwtService
  ) {}

  async register(dto: RegisterDto): Promise<{ accessToken: string }> {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException("Email already registered");

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({ id: randomUUID(), email: dto.email, passwordHash, name: dto.name });
    const saved = await this.userRepo.save(user);
    return { accessToken: this.jwtService.sign({ sub: saved.id, email: saved.email }) };
  }

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException("Invalid credentials");

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException("Invalid credentials");

    return { accessToken: this.jwtService.sign({ sub: user.id, email: user.email }) };
  }

  async generateApiKey(userId: string, dto: CreateApiKeyDto): Promise<ApiKeyCreated> {
    const rawKey = `erd_${randomBytes(32).toString("hex")}`;
    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    const prefix = rawKey.slice(0, 16);

    let name: string | null = dto.name?.trim() ?? null;
    if (!name) {
      const count = await this.apiKeyRepo.count({ where: { userId } });
      name = `API Key #${count + 1}`;
    }
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;

    const entry = this.apiKeyRepo.create({ id: randomUUID(), userId, keyHash, prefix, revokedAt: null, name, expiresAt });
    const saved = await this.apiKeyRepo.save(entry);
    return { apiKey: rawKey, id: saved.id, name: saved.name, prefix: saved.prefix, expiresAt: saved.expiresAt, createdAt: saved.createdAt };
  }

  async regenerateApiKey(userId: string, keyId: string): Promise<ApiKeyCreated> {
    const existing = await this.apiKeyRepo.findOne({ where: { id: keyId, userId, revokedAt: IsNull() } });
    if (!existing) throw new NotFoundException("API key not found");

    existing.revokedAt = new Date();
    await this.apiKeyRepo.save(existing);

    const rawKey = `erd_${randomBytes(32).toString("hex")}`;
    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    const prefix = rawKey.slice(0, 16);

    const entry = this.apiKeyRepo.create({
      id: randomUUID(),
      userId,
      keyHash,
      prefix,
      revokedAt: null,
      name: existing.name,
      expiresAt: existing.expiresAt,
    });
    const saved = await this.apiKeyRepo.save(entry);
    return { apiKey: rawKey, id: saved.id, name: saved.name, prefix: saved.prefix, expiresAt: saved.expiresAt, createdAt: saved.createdAt };
  }

  async validateApiKey(rawKey: string): Promise<JwtPayload | null> {
    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    const entry = await this.apiKeyRepo.findOne({
      where: { keyHash, revokedAt: IsNull() },
      relations: ["user"],
    });
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < new Date()) return null;
    return { sub: entry.userId, email: entry.user.email };
  }

  async listApiKeys(userId: string): Promise<ApiKeyInfo[]> {
    const keys = await this.apiKeyRepo.find({
      where: { userId, revokedAt: IsNull() },
      order: { createdAt: "DESC" },
    });
    return keys.map(k => ({ id: k.id, name: k.name, prefix: k.prefix, expiresAt: k.expiresAt, createdAt: k.createdAt }));
  }

  async revokeApiKey(userId: string, keyId: string): Promise<void> {
    const entry = await this.apiKeyRepo.findOne({ where: { id: keyId, userId, revokedAt: IsNull() } });
    if (!entry) throw new NotFoundException("API key not found");
    entry.revokedAt = new Date();
    await this.apiKeyRepo.save(entry);
  }

  async getMe(userId: string): Promise<UserProfile> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");
    return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserProfile> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");
    if (dto.name !== undefined) user.name = dto.name;
    const saved = await this.userRepo.save(user);
    return { id: saved.id, email: saved.email, name: saved.name, avatarUrl: saved.avatarUrl };
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException("현재 비밀번호가 올바르지 않습니다.");
    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepo.save(user);
  }

  async uploadAvatar(userId: string, file: Express.Multer.File): Promise<UserProfile> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    const ext = extname(file.originalname).toLowerCase() || ".jpg";
    const filename = `${userId}${ext}`;
    const uploadDir = join(process.cwd(), "uploads", "avatars");
    await writeFile(join(uploadDir, filename), file.buffer);

    if (user.avatarUrl) {
      const oldFilename = user.avatarUrl.split("/").pop();
      if (oldFilename && oldFilename !== filename) {
        await unlink(join(uploadDir, oldFilename)).catch(() => undefined);
      }
    }

    user.avatarUrl = `/uploads/avatars/${filename}`;
    const saved = await this.userRepo.save(user);
    return { id: saved.id, email: saved.email, name: saved.name, avatarUrl: saved.avatarUrl };
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/auth/dto/create-api-key.dto.ts apps/api/src/modules/auth/auth.service.ts
git commit -m "feat(api): add CreateApiKeyDto; update AuthService for name/expiresAt and add regenerateApiKey"
```

---

### Task 3: API — Update AuthService tests

**Files:**
- Modify: `apps/api/src/modules/auth/auth.service.spec.ts`

- [ ] **Step 1: Write updated tests**

Replace the full contents of `apps/api/src/modules/auth/auth.service.spec.ts`:

```typescript
import * as bcrypt from "bcryptjs";
import { ConflictException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import type { JwtService } from "@nestjs/jwt";
import type { ApiKey, User } from "@erdify/db";
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
  let jwtService: { sign: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    userRepo = { findOne: vi.fn(), create: vi.fn(), save: vi.fn(), find: vi.fn(), count: vi.fn() };
    apiKeyRepo = { findOne: vi.fn(), create: vi.fn(), save: vi.fn(), find: vi.fn(), count: vi.fn() };
    jwtService = { sign: vi.fn() };
    service = new AuthService(
      userRepo as unknown as Repository<User>,
      apiKeyRepo as unknown as Repository<ApiKey>,
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
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
pnpm --filter api test
```

Expected: all tests pass (including the new `generateApiKey`, `regenerateApiKey`, `validateApiKey` suites).

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/auth/auth.service.spec.ts
git commit -m "test(api): update AuthService tests for name/expiresAt and regenerateApiKey"
```

---

### Task 4: API — Update Controller

**Files:**
- Modify: `apps/api/src/modules/auth/auth.controller.ts`

- [ ] **Step 1: Update auth.controller.ts**

Replace the full contents of `apps/api/src/modules/auth/auth.controller.ts`:

```typescript
import type { Response } from "express";
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import type { UserProfile, ApiKeyInfo, ApiKeyCreated } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import type { JwtPayload } from "./strategies/jwt.strategy";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { CreateApiKeyDto } from "./dto/create-api-key.dto";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env["COOKIE_SECURE"] === "true",
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

const ALLOWED_AVATAR_MIMES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post("register")
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    const { accessToken } = await this.authService.register(dto);
    res.cookie("access_token", accessToken, COOKIE_OPTIONS);
    return { ok: true };
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    const { accessToken } = await this.authService.login(dto);
    res.cookie("access_token", accessToken, COOKIE_OPTIONS);
    return { ok: true };
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie("access_token", { path: "/" });
  }

  // ── API Keys ────────────────────────────────────────────────────────────────

  @Post("api-keys")
  @UseGuards(JwtAuthGuard)
  generateApiKey(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateApiKeyDto,
  ): Promise<ApiKeyCreated> {
    return this.authService.generateApiKey(user.sub, dto);
  }

  @Post("api-keys/:id/regenerate")
  @UseGuards(JwtAuthGuard)
  regenerateApiKey(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
  ): Promise<ApiKeyCreated> {
    return this.authService.regenerateApiKey(user.sub, id);
  }

  @Get("api-keys")
  @UseGuards(JwtAuthGuard)
  listApiKeys(@CurrentUser() user: JwtPayload): Promise<ApiKeyInfo[]> {
    return this.authService.listApiKeys(user.sub);
  }

  @Delete("api-keys/:id")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  revokeApiKey(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
  ): Promise<void> {
    return this.authService.revokeApiKey(user.sub, id);
  }

  // ── Profile ─────────────────────────────────────────────────────────────────

  @Get("me")
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: JwtPayload): Promise<UserProfile> {
    return this.authService.getMe(user.sub);
  }

  @Patch("profile")
  @UseGuards(JwtAuthGuard)
  updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto): Promise<UserProfile> {
    return this.authService.updateProfile(user.sub, dto);
  }

  @Patch("password")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto): Promise<void> {
    return this.authService.changePassword(user.sub, dto);
  }

  @Post("avatar")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor("file", {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_AVATAR_MIMES.has(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("이미지 파일만 업로드할 수 있습니다 (JPEG, PNG, GIF, WebP)"), false);
      }
    },
  }))
  uploadAvatar(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UserProfile> {
    return this.authService.uploadAvatar(user.sub, file);
  }
}
```

- [ ] **Step 2: Run tests**

```bash
pnpm --filter api test
```

Expected: all tests still pass.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/auth/auth.controller.ts
git commit -m "feat(api): add regenerate endpoint to auth controller"
```

---

### Task 5: Frontend — API client + tests

**Files:**
- Create: `apps/web/src/shared/api/api-keys.api.ts`
- Create: `apps/web/src/shared/api/api-keys.api.test.ts`
- Modify: `apps/web/src/shared/api/auth.api.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/web/src/shared/api/api-keys.api.test.ts`:

```typescript
import { listApiKeys, createApiKey, revokeApiKey, regenerateApiKey } from "./api-keys.api";
import { httpClient } from "./httpClient";

vi.mock("./httpClient", () => ({
  httpClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

const mockKey = {
  id: "key-1",
  name: "Production",
  prefix: "erd_abcdef012345",
  expiresAt: "2026-12-31T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("api-keys.api", () => {
  it("listApiKeys calls GET /auth/api-keys", async () => {
    vi.mocked(httpClient.get).mockResolvedValue({ data: [mockKey] });
    const result = await listApiKeys();
    expect(httpClient.get).toHaveBeenCalledWith("/auth/api-keys");
    expect(result).toEqual([mockKey]);
  });

  it("createApiKey calls POST /auth/api-keys with body", async () => {
    const created = { apiKey: "erd_fullkey", ...mockKey };
    vi.mocked(httpClient.post).mockResolvedValue({ data: created });
    const result = await createApiKey({ name: "Production", expiresAt: "2026-12-31T00:00:00.000Z" });
    expect(httpClient.post).toHaveBeenCalledWith("/auth/api-keys", { name: "Production", expiresAt: "2026-12-31T00:00:00.000Z" });
    expect(result).toEqual(created);
  });

  it("revokeApiKey calls DELETE /auth/api-keys/:id", async () => {
    vi.mocked(httpClient.delete).mockResolvedValue({});
    await revokeApiKey("key-1");
    expect(httpClient.delete).toHaveBeenCalledWith("/auth/api-keys/key-1");
  });

  it("regenerateApiKey calls POST /auth/api-keys/:id/regenerate", async () => {
    const created = { apiKey: "erd_newkey", ...mockKey, id: "key-2" };
    vi.mocked(httpClient.post).mockResolvedValue({ data: created });
    const result = await regenerateApiKey("key-1");
    expect(httpClient.post).toHaveBeenCalledWith("/auth/api-keys/key-1/regenerate");
    expect(result).toEqual(created);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter web test
```

Expected: FAIL — "api-keys.api" module not found.

- [ ] **Step 3: Create api-keys.api.ts**

Create `apps/web/src/shared/api/api-keys.api.ts`:

```typescript
import { httpClient } from "./httpClient";

export interface ApiKeyItem {
  id: string;
  name: string | null;
  prefix: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface ApiKeyCreated {
  apiKey: string;
  id: string;
  name: string | null;
  prefix: string;
  expiresAt: string | null;
  createdAt: string;
}

export const listApiKeys = (): Promise<ApiKeyItem[]> =>
  httpClient.get<ApiKeyItem[]>("/auth/api-keys").then((r) => r.data);

export const createApiKey = (body: { name?: string; expiresAt?: string }): Promise<ApiKeyCreated> =>
  httpClient.post<ApiKeyCreated>("/auth/api-keys", body).then((r) => r.data);

export const revokeApiKey = (id: string): Promise<void> =>
  httpClient.delete(`/auth/api-keys/${id}`).then(() => undefined);

export const regenerateApiKey = (id: string): Promise<ApiKeyCreated> =>
  httpClient.post<ApiKeyCreated>(`/auth/api-keys/${id}/regenerate`).then((r) => r.data);
```

- [ ] **Step 4: Remove generateApiKey from auth.api.ts**

In `apps/web/src/shared/api/auth.api.ts`, remove the `generateApiKey` function (lines 22-24):

```typescript
// DELETE these lines:
export function generateApiKey(): Promise<{ apiKey: string }> {
  return httpClient.post<{ apiKey: string }>("/auth/api-keys").then((r) => r.data);
}
```

- [ ] **Step 5: Run tests**

```bash
pnpm --filter web test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/shared/api/api-keys.api.ts apps/web/src/shared/api/api-keys.api.test.ts apps/web/src/shared/api/auth.api.ts
git commit -m "feat(web): add api-keys API client; remove generateApiKey from auth.api"
```

---

### Task 6: Frontend — ApiKeysPage CSS + Component

**Files:**
- Create: `apps/web/src/features/settings/pages/api-keys-page.css.ts`
- Create: `apps/web/src/features/settings/pages/ApiKeysPage.tsx`

- [ ] **Step 1: Create CSS file**

Create `apps/web/src/features/settings/pages/api-keys-page.css.ts`:

```typescript
import { style } from "@vanilla-extract/css";
import { vars } from "../../../design-system/tokens.css";

export const page = style({
  minHeight: "100vh",
  background: vars.color.surfaceTertiary,
  padding: vars.space["7"],
});

export const container = style({
  maxWidth: "900px",
  margin: "0 auto",
});

export const header = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["4"],
  marginBottom: vars.space["6"],
});

export const backBtn = style({
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  background: "none",
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  color: vars.color.textSecondary,
  fontSize: "13px",
  cursor: "pointer",
  fontFamily: vars.font.family,
  selectors: { "&:hover": { background: vars.color.surfaceSecondary } },
});

export const title = style({
  flex: 1,
  fontSize: "20px",
  fontWeight: "700",
  color: vars.color.textPrimary,
  margin: 0,
});

export const createBtn = style({
  padding: `${vars.space["2"]} ${vars.space["4"]}`,
  background: vars.color.primary,
  color: "#fff",
  border: "none",
  borderRadius: vars.radius.md,
  fontSize: "13px",
  fontWeight: "600",
  cursor: "pointer",
  fontFamily: vars.font.family,
  selectors: { "&:hover": { background: vars.color.primaryHover } },
});

export const createForm = style({
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  padding: vars.space["6"],
  marginBottom: vars.space["5"],
  display: "flex",
  flexDirection: "column",
  gap: vars.space["4"],
});

export const formRow = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space["2"],
});

export const label = style({
  fontSize: "12px",
  fontWeight: "600",
  color: vars.color.textPrimary,
});

export const optional = style({
  fontWeight: "400",
  color: vars.color.textSecondary,
});

export const input = style({
  padding: `${vars.space["2"]} ${vars.space["3"]}`,
  border: `1.5px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  fontSize: "13px",
  color: vars.color.textPrimary,
  fontFamily: vars.font.family,
  outline: "none",
  selectors: {
    "&:focus": { borderColor: vars.color.primary, boxShadow: `0 0 0 3px ${vars.color.focusRing}` },
  },
});

export const chips = style({
  display: "flex",
  gap: vars.space["2"],
  flexWrap: "wrap",
});

export const chip = style({
  padding: `${vars.space["1"]} ${vars.space["3"]}`,
  border: `1.5px solid ${vars.color.border}`,
  borderRadius: vars.radius.pill,
  fontSize: "12px",
  color: vars.color.textSecondary,
  background: vars.color.surface,
  cursor: "pointer",
  fontFamily: vars.font.family,
  selectors: { "&:hover": { borderColor: vars.color.borderStrong } },
});

export const chipActive = style({
  padding: `${vars.space["1"]} ${vars.space["3"]}`,
  border: `1.5px solid ${vars.color.primary}`,
  borderRadius: vars.radius.pill,
  fontSize: "12px",
  color: vars.color.primary,
  background: vars.color.selectedBg,
  fontWeight: "600",
  cursor: "pointer",
  fontFamily: vars.font.family,
});

export const formActions = style({
  display: "flex",
  justifyContent: "flex-end",
});

export const createSubmitBtn = style({
  padding: `${vars.space["2"]} ${vars.space["5"]}`,
  background: vars.color.primary,
  color: "#fff",
  border: "none",
  borderRadius: vars.radius.md,
  fontSize: "13px",
  fontWeight: "600",
  cursor: "pointer",
  fontFamily: vars.font.family,
  selectors: {
    "&:disabled": { opacity: 0.5, cursor: "not-allowed" },
    "&:hover:not(:disabled)": { background: vars.color.primaryHover },
  },
});

export const errorMsg = style({
  fontSize: "12px",
  color: vars.color.error,
  margin: 0,
});

export const revealBox = style({
  background: "#fffbeb",
  border: "1px solid #fcd34d",
  borderRadius: vars.radius.lg,
  padding: vars.space["5"],
  marginBottom: vars.space["5"],
  display: "flex",
  flexDirection: "column",
  gap: vars.space["3"],
});

export const revealWarning = style({
  fontSize: "13px",
  color: "#92400e",
  margin: 0,
  fontWeight: "500",
});

export const keyBox = style({
  display: "flex",
  gap: vars.space["2"],
  alignItems: "stretch",
});

export const keyText = style({
  flex: 1,
  fontFamily: "var(--font-mono, 'Courier New', monospace)",
  fontSize: "11px",
  padding: vars.space["2"],
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  color: vars.color.textPrimary,
  wordBreak: "break-all",
  lineHeight: "1.5",
  userSelect: "all",
});

export const copyBtn = style({
  flexShrink: 0,
  padding: `0 ${vars.space["3"]}`,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  background: vars.color.surface,
  color: vars.color.textSecondary,
  fontSize: "12px",
  cursor: "pointer",
  fontFamily: vars.font.family,
});

export const copySuccessBtn = style({
  flexShrink: 0,
  padding: `0 ${vars.space["3"]}`,
  border: "1px solid #16a34a",
  borderRadius: vars.radius.md,
  background: "#dcfce7",
  color: "#15803d",
  fontSize: "12px",
  fontWeight: "600",
  cursor: "pointer",
  fontFamily: vars.font.family,
});

export const confirmBtn = style({
  alignSelf: "flex-start",
  padding: `${vars.space["2"]} ${vars.space["4"]}`,
  background: vars.color.textPrimary,
  color: "#fff",
  border: "none",
  borderRadius: vars.radius.md,
  fontSize: "12px",
  fontWeight: "600",
  cursor: "pointer",
  fontFamily: vars.font.family,
});

export const emptyMsg = style({
  textAlign: "center",
  color: vars.color.textSecondary,
  fontSize: "14px",
  padding: vars.space["8"],
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
});

export const table = style({
  width: "100%",
  borderCollapse: "collapse",
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  overflow: "hidden",
});

export const th = style({
  textAlign: "left",
  padding: `${vars.space["3"]} ${vars.space["4"]}`,
  background: vars.color.surfaceSecondary,
  fontSize: "11px",
  fontWeight: "600",
  color: vars.color.textSecondary,
  borderBottom: `1px solid ${vars.color.border}`,
});

export const tr = style({
  selectors: {
    "&:not(:last-child)": { borderBottom: `1px solid ${vars.color.border}` },
    "&:hover": { background: vars.color.surfaceTertiary },
  },
});

export const td = style({
  padding: `${vars.space["3"]} ${vars.space["4"]}`,
  fontSize: "13px",
  color: vars.color.textPrimary,
  verticalAlign: "middle",
});

export const tdMono = style({
  padding: `${vars.space["3"]} ${vars.space["4"]}`,
  fontSize: "12px",
  color: vars.color.textPrimary,
  fontFamily: "var(--font-mono, 'Courier New', monospace)",
  verticalAlign: "middle",
});

export const tdActions = style({
  padding: `${vars.space["2"]} ${vars.space["4"]}`,
  verticalAlign: "middle",
});

export const actionsRow = style({
  display: "flex",
  gap: vars.space["2"],
  alignItems: "center",
});

export const badgeActive = style({
  display: "inline-block",
  padding: `2px 8px`,
  borderRadius: vars.radius.pill,
  fontSize: "11px",
  fontWeight: "600",
  background: "#dcfce7",
  color: "#16a34a",
});

export const badgeExpiring = style({
  display: "inline-block",
  padding: `2px 8px`,
  borderRadius: vars.radius.pill,
  fontSize: "11px",
  fontWeight: "600",
  background: "#fef9c3",
  color: "#a16207",
});

export const badgeExpired = style({
  display: "inline-block",
  padding: `2px 8px`,
  borderRadius: vars.radius.pill,
  fontSize: "11px",
  fontWeight: "600",
  background: vars.color.surfaceSecondary,
  color: vars.color.textDisabled,
});

export const actionBtn = style({
  padding: `${vars.space["1"]} ${vars.space["3"]}`,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  background: vars.color.surface,
  color: vars.color.textSecondary,
  fontSize: "12px",
  cursor: "pointer",
  fontFamily: vars.font.family,
  selectors: {
    "&:hover": { background: vars.color.surfaceSecondary, color: vars.color.textPrimary },
  },
});

export const actionBtnDanger = style({
  selectors: {
    "&:hover": { background: "#fee2e2", color: vars.color.error, borderColor: "#fca5a5" },
  },
});

export const confirmInline = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space["2"],
  flexWrap: "wrap",
  fontSize: "12px",
  color: vars.color.textSecondary,
});

export const confirmYesBtn = style({
  padding: `2px 8px`,
  background: vars.color.error,
  color: "#fff",
  border: "none",
  borderRadius: vars.radius.sm,
  fontSize: "11px",
  cursor: "pointer",
  fontFamily: vars.font.family,
  selectors: { "&:disabled": { opacity: 0.5 } },
});

export const confirmNoBtn = style({
  padding: `2px 8px`,
  background: "none",
  color: vars.color.textSecondary,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  fontSize: "11px",
  cursor: "pointer",
  fontFamily: vars.font.family,
});
```

- [ ] **Step 2: Create ApiKeysPage component**

Create `apps/web/src/features/settings/pages/ApiKeysPage.tsx`:

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listApiKeys, createApiKey, revokeApiKey, regenerateApiKey } from "../../../shared/api/api-keys.api";
import type { ApiKeyItem, ApiKeyCreated } from "../../../shared/api/api-keys.api";
import { copyToClipboard } from "../../../shared/utils/clipboard";
import * as css from "./api-keys-page.css";

type ExpiryPreset = "30d" | "90d" | "1y" | "none" | "custom";

const PRESET_LABELS: Record<ExpiryPreset, string> = {
  "30d": "30일",
  "90d": "90일",
  "1y": "1년",
  none: "무기한",
  custom: "직접 입력",
};

function expiresAtFromPreset(preset: ExpiryPreset, customDate: string): string | undefined {
  if (preset === "30d") return new Date(Date.now() + 30 * 86400000).toISOString();
  if (preset === "90d") return new Date(Date.now() + 90 * 86400000).toISOString();
  if (preset === "1y") return new Date(Date.now() + 365 * 86400000).toISOString();
  if (preset === "custom" && customDate) return new Date(customDate).toISOString();
  return undefined;
}

function getStatusInfo(key: ApiKeyItem): { label: string; type: "active" | "expiring" | "expired" } {
  if (!key.expiresAt) return { label: "활성", type: "active" };
  const ms = new Date(key.expiresAt).getTime() - Date.now();
  if (ms < 0) return { label: "만료됨", type: "expired" };
  if (ms < 7 * 86400000) return { label: `D-${Math.ceil(ms / 86400000)}`, type: "expiring" };
  return { label: "활성", type: "active" };
}

const BADGE_CLASS: Record<"active" | "expiring" | "expired", string> = {
  active: css.badgeActive,
  expiring: css.badgeExpiring,
  expired: css.badgeExpired,
};

export const ApiKeysPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formExpiry, setFormExpiry] = useState<ExpiryPreset>("1y");
  const [formCustomDate, setFormCustomDate] = useState("");

  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
  const [confirmRegenerateId, setConfirmRegenerateId] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<ApiKeyCreated | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: listApiKeys,
  });

  const createMutation = useMutation({
    mutationFn: createApiKey,
    onSuccess: (data) => {
      setRevealedKey(data);
      setShowForm(false);
      setFormName("");
      setFormExpiry("1y");
      setFormCustomDate("");
      void queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: revokeApiKey,
    onSuccess: () => {
      setConfirmRevokeId(null);
      void queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: regenerateApiKey,
    onSuccess: (data) => {
      setRevealedKey(data);
      setConfirmRegenerateId(null);
      void queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });

  function handleCreate() {
    const expiresAt = expiresAtFromPreset(formExpiry, formCustomDate);
    createMutation.mutate({ name: formName.trim() || undefined, expiresAt });
  }

  async function handleCopyKey() {
    if (!revealedKey) return;
    await copyToClipboard(revealedKey.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDismissReveal() {
    setRevealedKey(null);
    setCopied(false);
  }

  return (
    <div className={css.page}>
      <div className={css.container}>
        <div className={css.header}>
          <button className={css.backBtn} onClick={() => navigate("/")}>← 대시보드</button>
          <h1 className={css.title}>API 키 관리</h1>
          <button className={css.createBtn} onClick={() => setShowForm((v) => !v)}>
            {showForm ? "취소" : "+ 새 키 생성"}
          </button>
        </div>

        {showForm && (
          <div className={css.createForm}>
            <div className={css.formRow}>
              <label className={css.label}>
                키 이름 <span className={css.optional}>(선택)</span>
              </label>
              <input
                className={css.input}
                type="text"
                placeholder="예: Production, Claude MCP"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className={css.formRow}>
              <label className={css.label}>만료 기간</label>
              <div className={css.chips}>
                {(["30d", "90d", "1y", "none", "custom"] as ExpiryPreset[]).map((p) => (
                  <button
                    key={p}
                    className={formExpiry === p ? css.chipActive : css.chip}
                    onClick={() => setFormExpiry(p)}
                  >
                    {PRESET_LABELS[p]}
                  </button>
                ))}
              </div>
              {formExpiry === "custom" && (
                <input
                  className={css.input}
                  type="date"
                  value={formCustomDate}
                  onChange={(e) => setFormCustomDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  style={{ marginTop: 8 }}
                />
              )}
            </div>
            <div className={css.formActions}>
              <button
                className={css.createSubmitBtn}
                onClick={handleCreate}
                disabled={createMutation.isPending || (formExpiry === "custom" && !formCustomDate)}
              >
                {createMutation.isPending ? "생성 중..." : "키 생성"}
              </button>
            </div>
            {createMutation.isError && <p className={css.errorMsg}>키 생성에 실패했습니다.</p>}
          </div>
        )}

        {revealedKey && (
          <div className={css.revealBox}>
            <p className={css.revealWarning}>
              이 키는 지금만 표시됩니다. 안전한 곳에 복사해 보관하세요.
            </p>
            <div className={css.keyBox}>
              <span className={css.keyText}>{revealedKey.apiKey}</span>
              <button
                className={copied ? css.copySuccessBtn : css.copyBtn}
                onClick={handleCopyKey}
              >
                {copied ? "복사됨 ✓" : "복사"}
              </button>
            </div>
            <button className={css.confirmBtn} onClick={handleDismissReveal}>확인</button>
          </div>
        )}

        {isLoading ? (
          <p className={css.emptyMsg}>불러오는 중...</p>
        ) : keys.length === 0 ? (
          <p className={css.emptyMsg}>API 키가 없습니다. 새 키를 생성해주세요.</p>
        ) : (
          <table className={css.table}>
            <thead>
              <tr>
                <th className={css.th}>이름</th>
                <th className={css.th}>접두사</th>
                <th className={css.th}>만료일</th>
                <th className={css.th}>상태</th>
                <th className={css.th}>생성일</th>
                <th className={css.th}></th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => {
                const status = getStatusInfo(key);
                return (
                  <tr key={key.id} className={css.tr}>
                    <td className={css.td}>{key.name ?? "—"}</td>
                    <td className={css.tdMono}>{key.prefix}••••</td>
                    <td className={css.td}>
                      {key.expiresAt
                        ? new Date(key.expiresAt).toLocaleDateString("ko-KR")
                        : "무기한"}
                    </td>
                    <td className={css.td}>
                      <span className={BADGE_CLASS[status.type]}>{status.label}</span>
                    </td>
                    <td className={css.td}>
                      {new Date(key.createdAt).toLocaleDateString("ko-KR")}
                    </td>
                    <td className={css.tdActions}>
                      {confirmRegenerateId === key.id ? (
                        <div className={css.confirmInline}>
                          <span>기존 키가 즉시 무효화됩니다.</span>
                          <button
                            className={css.confirmYesBtn}
                            onClick={() => regenerateMutation.mutate(key.id)}
                            disabled={regenerateMutation.isPending}
                          >
                            확인
                          </button>
                          <button
                            className={css.confirmNoBtn}
                            onClick={() => setConfirmRegenerateId(null)}
                          >
                            취소
                          </button>
                        </div>
                      ) : confirmRevokeId === key.id ? (
                        <div className={css.confirmInline}>
                          <span>정말 폐기할까요?</span>
                          <button
                            className={css.confirmYesBtn}
                            onClick={() => revokeMutation.mutate(key.id)}
                            disabled={revokeMutation.isPending}
                          >
                            확인
                          </button>
                          <button
                            className={css.confirmNoBtn}
                            onClick={() => setConfirmRevokeId(null)}
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <div className={css.actionsRow}>
                          <button
                            className={css.actionBtn}
                            onClick={() => setConfirmRegenerateId(key.id)}
                          >
                            재생성
                          </button>
                          <button
                            className={`${css.actionBtn} ${css.actionBtnDanger}`}
                            onClick={() => setConfirmRevokeId(key.id)}
                          >
                            폐기
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Run typecheck**

```bash
pnpm --filter web typecheck
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/settings/pages/api-keys-page.css.ts apps/web/src/features/settings/pages/ApiKeysPage.tsx
git commit -m "feat(web): add ApiKeysPage with list, create, revoke, regenerate"
```

---

### Task 7: Frontend — Routing + Dashboard wiring + cleanup

**Files:**
- Modify: `apps/web/src/app/Router.tsx`
- Modify: `apps/web/src/features/dashboard/pages/DashboardPage.tsx`
- Delete: `apps/web/src/features/dashboard/components/ApiKeyModal.tsx`
- Delete: `apps/web/src/features/dashboard/components/ApiKeyModal.css.ts`

- [ ] **Step 1: Add route to Router.tsx**

Replace the contents of `apps/web/src/app/Router.tsx`:

```tsx
import { Route, Routes } from "react-router-dom";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { RegisterPage } from "../features/auth/pages/RegisterPage";
import { EditorPage } from "../features/editor/pages/EditorPage";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import { ApiKeysPage } from "../features/settings/pages/ApiKeysPage";
import { SharedDiagramPage } from "../features/shared-diagram/pages/SharedDiagramPage";
import { ProtectedRoute } from "./routes/ProtectedRoute";

export const Router = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/share/:shareToken" element={<SharedDiagramPage />} />
    <Route element={<ProtectedRoute />}>
      <Route path="/diagrams/:diagramId" element={<EditorPage />} />
      <Route path="/settings/api-keys" element={<ApiKeysPage />} />
      <Route path="/*" element={<DashboardPage />} />
    </Route>
  </Routes>
);
```

- [ ] **Step 2: Update DashboardPage dropdown**

In `apps/web/src/features/dashboard/pages/DashboardPage.tsx`:

a) Add `useNavigate` import (it's already imported — `useNavigate` is already at line 2).

b) Remove `apiKeyModalOpen` state and `ApiKeyModal` import. Remove `setApiKeyModalOpen` and the `ApiKeyModal` component render.

c) Change the dropdown button from opening the modal to navigating:

Find this button in the `menuOpen` dropdown block:
```tsx
<button className={dropdownItem} onClick={() => { setMenuOpen(false); setApiKeyModalOpen(true); }}>
  MCP API 키
</button>
```

Replace it with:
```tsx
<button className={dropdownItem} onClick={() => { setMenuOpen(false); navigate("/settings/api-keys"); }}>
  API 키 관리
</button>
```

d) Remove the `useState` for `apiKeyModalOpen`:
```tsx
// DELETE this line:
const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
```

e) Remove the `ApiKeyModal` render at the bottom:
```tsx
// DELETE these lines:
<ApiKeyModal
  open={apiKeyModalOpen}
  onClose={() => setApiKeyModalOpen(false)}
/>
```

f) Remove the `ApiKeyModal` import at the top:
```tsx
// DELETE this line:
import { ApiKeyModal } from "../components/ApiKeyModal";
```

- [ ] **Step 3: Delete ApiKeyModal files**

```bash
rm apps/web/src/features/dashboard/components/ApiKeyModal.tsx
rm apps/web/src/features/dashboard/components/ApiKeyModal.css.ts
```

- [ ] **Step 4: Run typecheck and tests**

```bash
pnpm --filter web typecheck && pnpm --filter web test
```

Expected: no TypeScript errors, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/Router.tsx apps/web/src/features/dashboard/pages/DashboardPage.tsx
git rm apps/web/src/features/dashboard/components/ApiKeyModal.tsx apps/web/src/features/dashboard/components/ApiKeyModal.css.ts
git commit -m "feat(web): wire /settings/api-keys route; remove ApiKeyModal"
```
