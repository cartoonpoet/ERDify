import { randomUUID } from "crypto";
import { extname, join } from "path";
import { writeFile, unlink } from "fs/promises";
import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "@erdify/db";
import * as bcrypt from "bcryptjs";
import type { Repository } from "typeorm";
import type { ChangePasswordDto } from "./dto/change-password.dto";
import type { LoginDto } from "./dto/login.dto";
import type { RegisterDto } from "./dto/register.dto";
import type { UpdateProfileDto } from "./dto/update-profile.dto";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
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

  generateApiKey(userId: string, email: string): { apiKey: string } {
    return { apiKey: this.jwtService.sign({ sub: userId, email }, { expiresIn: "100y" }) };
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
