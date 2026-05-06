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
    @InjectRepository(Invite)
    private readonly inviteRepo: Repository<Invite>,
    @InjectRepository(OrganizationMember)
    private readonly memberRepo: Repository<OrganizationMember>,
    private readonly jwtService: JwtService
  ) {}

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
