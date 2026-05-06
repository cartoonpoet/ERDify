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
