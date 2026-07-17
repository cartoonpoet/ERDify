import { createHash, randomBytes, randomInt, randomUUID } from "crypto";
import { extname, join } from "path";
import { writeFile, unlink } from "fs/promises";
import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { ApiKey, Invite, OauthAccount, Organization, OrganizationMember, User } from "@erdify/db";
import * as bcrypt from "bcryptjs";
import { DataSource, IsNull, MoreThan, In, type Repository } from "typeorm";
import { encrypt, decrypt } from "../../common/utils/field-cipher";
import { EmailService } from "../email/email.service";
import type { ChangePasswordDto } from "./dto/change-password.dto";
import type { CreateApiKeyDto } from "./dto/create-api-key.dto";
import type { LoginDto } from "./dto/login.dto";
import type { RegisterDto } from "./dto/register.dto";
import type { UpdateProfileDto } from "./dto/update-profile.dto";
import type { JwtPayload } from "./strategies/jwt.strategy";
import type { SocialOnboardTokenPayload } from "@erdify/contracts";

interface VerificationEntry {
  code: string;
  expiresAt: number;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
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
  private readonly verificationCodes = new Map<string, VerificationEntry>();

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(ApiKey)
    private readonly apiKeyRepo: Repository<ApiKey>,
    @InjectRepository(Invite)
    private readonly inviteRepo: Repository<Invite>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(OrganizationMember)
    private readonly memberRepo: Repository<OrganizationMember>,
    @InjectRepository(OauthAccount)
    private readonly oauthAccountRepo: Repository<OauthAccount>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async sendVerificationCode(email: string): Promise<void> {
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) throw new ConflictException("이미 가입된 이메일입니다.");
    // crypto.randomInt는 CSPRNG 기반이라 Math.random()과 달리 인증 코드를 예측할 수 없다.
    const code = String(randomInt(100000, 1000000));
    this.verificationCodes.set(email, { code, expiresAt: Date.now() + 5 * 60 * 1000 });
    await this.emailService.sendVerificationEmail({ to: email, code });
  }

  verifyCode(email: string, code: string): { verifiedToken: string } {
    const entry = this.verificationCodes.get(email);
    if (!entry || entry.code !== code || Date.now() > entry.expiresAt) {
      throw new BadRequestException("인증 코드가 올바르지 않거나 만료되었습니다.");
    }
    this.verificationCodes.delete(email);
    const verifiedToken = this.jwtService.sign(
      { purpose: "email-verification", email },
      { expiresIn: "30m" }
    );
    return { verifiedToken };
  }

  async getInviteByToken(token: string): Promise<{ email: string; verifiedToken: string }> {
    const invite = await this.inviteRepo.findOne({
      where: { token, acceptedAt: IsNull(), expiresAt: MoreThan(new Date()) },
    });
    if (!invite) throw new NotFoundException("유효하지 않거나 만료된 초대입니다.");
    const verifiedToken = this.jwtService.sign(
      { purpose: "email-verification", email: invite.email },
      { expiresIn: "30m" }
    );
    return { email: invite.email, verifiedToken };
  }

  async register(dto: RegisterDto): Promise<{ accessToken: string }> {
    // verifiedToken must confirm this exact email
    let payload: { purpose?: string; email?: string };
    try {
      payload = this.jwtService.verify<{ purpose: string; email: string }>(dto.verifiedToken);
    } catch {
      throw new BadRequestException("이메일 인증이 완료되지 않았습니다.");
    }
    if (payload.purpose !== "email-verification" || payload.email !== dto.email) {
      throw new BadRequestException("이메일 인증이 완료되지 않았습니다.");
    }

    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException("Email already registered");

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const phone = dto.phone ? encrypt(dto.phone) : null;
    const user = this.userRepo.create({ id: randomUUID(), email: dto.email, passwordHash, name: dto.name, phone });
    const saved = await this.userRepo.save(user);

    // auto-accept pending invites
    const pendingInvites = await this.inviteRepo.find({
      where: { email: dto.email, acceptedAt: IsNull(), expiresAt: MoreThan(new Date()) },
    });

    if (pendingInvites.length > 0) {
      const orgIds = pendingInvites.map((i) => i.orgId);
      const existingMembers = await this.memberRepo.find({
        where: { organizationId: In(orgIds), userId: saved.id },
      });
      const existingOrgIds = new Set(existingMembers.map((m) => m.organizationId));

      const newMembers = pendingInvites
        .filter((i) => !existingOrgIds.has(i.orgId))
        .map((i) => this.memberRepo.create({ organizationId: i.orgId, userId: saved.id, role: i.role }));

      await this.memberRepo.save(newMembers);
      await this.inviteRepo.save(
        pendingInvites.map((i) => Object.assign(i, { acceptedAt: new Date() }))
      );
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
    return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, phone: user.phone ? decrypt(user.phone) : null, isAdmin: user.isAdmin };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserProfile> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");
    if (dto.name !== undefined) user.name = dto.name;
    const saved = await this.userRepo.save(user);
    return { id: saved.id, email: saved.email, name: saved.name, avatarUrl: saved.avatarUrl, phone: saved.phone ? decrypt(saved.phone) : null, isAdmin: saved.isAdmin };
  }

  async deleteAccount(userId: string): Promise<void> {
    // owner_id has no CASCADE, so delete owned orgs first (cascades to projects/diagrams)
    const ownedOrgs = await this.orgRepo.find({ where: { ownerId: userId } });
    if (ownedOrgs.length > 0) {
      await this.orgRepo.remove(ownedOrgs);
    }
    // memberships, api_keys, invites cascade-delete with the user
    await this.userRepo.delete(userId);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) return; // 이메일 존재 여부 노출 방지
    const token = this.jwtService.sign(
      { sub: user.id, purpose: "password-reset" },
      { expiresIn: "30m" }
    );
    const appUrl = process.env["APP_URL"] ?? "http://localhost:5173";
    await this.emailService.sendPasswordResetEmail({
      to: email,
      resetUrl: `${appUrl}/reset-password?token=${token}`,
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    let payload: { sub?: string; purpose?: string };
    try {
      payload = this.jwtService.verify<{ sub: string; purpose: string }>(token);
    } catch {
      throw new BadRequestException("유효하지 않거나 만료된 링크입니다.");
    }
    if (payload.purpose !== "password-reset" || !payload.sub) {
      throw new BadRequestException("유효하지 않거나 만료된 링크입니다.");
    }
    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user) throw new NotFoundException("사용자를 찾을 수 없습니다.");
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.userRepo.save(user);
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
    return { id: saved.id, email: saved.email, name: saved.name, avatarUrl: saved.avatarUrl, phone: saved.phone ? decrypt(saved.phone) : null, isAdmin: saved.isAdmin };
  }

  // ── Social OAuth ─────────────────────────────────────────────────────────────

  issueAccessToken(userId: string, email: string): string {
    return this.jwtService.sign({ sub: userId, email });
  }

  issueSocialOnboardToken(sub: string, email: string | undefined, provider: string, providerId: string): string {
    const secret = this.configService.get<string>("SOCIAL_ONBOARD_JWT_SECRET");
    if (!secret) throw new Error("SOCIAL_ONBOARD_JWT_SECRET environment variable is required");
    return this.jwtService.sign(
      { sub, email, provider, providerId, purpose: "social-onboard" },
      { secret, expiresIn: "15m" },
    );
  }

  async findOrCreateOAuthUser(
    provider: "kakao" | "naver" | "google",
    providerId: string,
    providerEmail: string | undefined,
    name?: string,
  ): Promise<{ user: User; isNew: boolean }> {
    return this.dataSource.transaction(async (manager) => {
      // 1단계: oauth_accounts에서 (provider, providerId) 조회
      const existingOAuth = await manager.findOne(OauthAccount, {
        where: { provider, providerId },
        relations: ["user"],
      });
      if (existingOAuth) {
        return { user: existingOAuth.user, isNew: false };
      }

      // 2단계: providerEmail로 기존 user 조회 (Account Linking)
      if (providerEmail) {
        const existingUser = await manager.findOne(User, { where: { email: providerEmail } });
        if (existingUser) {
          const oauthAccount = manager.create(OauthAccount, {
            id: randomUUID(),
            userId: existingUser.id,
            provider,
            providerId,
            providerEmail: providerEmail ?? null,
          });
          await manager.save(OauthAccount, oauthAccount);
          return { user: existingUser, isNew: false };
        }
      }

      // 3단계: 신규 user 생성
      const sentinelHash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);
      const newUser = manager.create(User, {
        id: randomUUID(),
        email: providerEmail ?? `${provider}_${providerId}@social.erdify.local`,
        passwordHash: sentinelHash,
        name: name ?? "소셜 사용자",
      });
      const savedUser = await manager.save(User, newUser);

      const oauthAccount = manager.create(OauthAccount, {
        id: randomUUID(),
        userId: savedUser.id,
        provider,
        providerId,
        providerEmail: providerEmail ?? null,
      });
      await manager.save(OauthAccount, oauthAccount);

      return { user: savedUser, isNew: true };
    });
  }

  async onboardSocialUser(onboardToken: string, name: string): Promise<{ accessToken: string }> {
    const secret = this.configService.get<string>("SOCIAL_ONBOARD_JWT_SECRET");
    if (!secret) throw new Error("SOCIAL_ONBOARD_JWT_SECRET environment variable is required");

    let payload: SocialOnboardTokenPayload;
    try {
      payload = this.jwtService.verify<SocialOnboardTokenPayload>(onboardToken, { secret });
    } catch {
      throw new UnauthorizedException("유효하지 않거나 만료된 온보딩 토큰입니다.");
    }

    if (payload.purpose !== "social-onboard") {
      throw new UnauthorizedException("유효하지 않은 토큰입니다.");
    }

    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user) throw new NotFoundException("사용자를 찾을 수 없습니다.");

    user.name = name;
    const saved = await this.userRepo.save(user);

    return { accessToken: this.jwtService.sign({ sub: saved.id, email: saved.email }) };
  }
}
