import type { Request, Response } from "express";
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import { IsEmail, IsString, Length, MinLength } from "class-validator";
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
import { SocialOnboardDto } from "./dto/social-onboard.dto";

class SendVerificationDto {
  @IsEmail()
  email!: string;
}

class VerifyCodeDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}

class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}

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
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @Post("send-verification")
  @HttpCode(HttpStatus.NO_CONTENT)
  async sendVerification(@Body() dto: SendVerificationDto): Promise<void> {
    await this.authService.sendVerificationCode(dto.email);
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post("verify-code")
  verifyCode(@Body() dto: VerifyCodeDto): { verifiedToken: string } {
    return this.authService.verifyCode(dto.email, dto.code);
  }

  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @Post("forgot-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    await this.authService.forgotPassword(dto.email);
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post("reset-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Get("invite/:token")
  getInvite(@Param("token") token: string): Promise<{ email: string; verifiedToken: string }> {
    return this.authService.getInviteByToken(token);
  }

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

  @Delete("me")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.deleteAccount(user.sub);
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

  // ── Social OAuth ─────────────────────────────────────────────────────────────

  private get webUrl(): string {
    return this.configService.get<string>("WEB_URL") ?? "http://localhost:5173";
  }

  private async handleSocialCallback(
    provider: "kakao" | "naver" | "google",
    req: Request,
    res: Response,
  ): Promise<void> {
    const webUrl = this.webUrl;
    try {
      const { providerId, providerEmail, name } = req.user as {
        providerId: string;
        providerEmail: string | undefined;
        name: string;
      };
      const { user, isNew } = await this.authService.findOrCreateOAuthUser(
        provider,
        providerId,
        providerEmail,
        name,
      );
      if (isNew) {
        const token = this.authService.issueSocialOnboardToken(user.id, user.email, provider, providerId);
        res.redirect(`${webUrl}/oauth/callback?status=onboard&token=${encodeURIComponent(token)}`);
      } else {
        const accessToken = this.authService.issueAccessToken(user.id, user.email);
        res.cookie("access_token", accessToken, COOKIE_OPTIONS);
        res.redirect(`${webUrl}/oauth/callback?status=success`);
      }
    } catch {
      res.redirect(`${webUrl}/oauth/callback?status=error&message=${encodeURIComponent("인증 오류")}`);
    }
  }

  @Get("kakao")
  @UseGuards(AuthGuard("kakao"))
  kakaoLogin(): void {
    // 카카오 인증 리다이렉트 — passport가 처리
  }

  @Get("kakao/callback")
  @UseGuards(AuthGuard("kakao"))
  async kakaoCallback(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.handleSocialCallback("kakao", req, res);
  }

  @Get("naver")
  @UseGuards(AuthGuard("naver"))
  naverLogin(): void {
    // 네이버 인증 리다이렉트 — passport가 처리
  }

  @Get("naver/callback")
  @UseGuards(AuthGuard("naver"))
  async naverCallback(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.handleSocialCallback("naver", req, res);
  }

  @Get("google")
  @UseGuards(AuthGuard("google"))
  googleLogin(): void {
    // 구글 인증 리다이렉트 — passport가 처리
  }

  @Get("google/callback")
  @UseGuards(AuthGuard("google"))
  async googleCallback(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.handleSocialCallback("google", req, res);
  }

  @Post("social/onboard")
  @HttpCode(HttpStatus.OK)
  async socialOnboard(
    @Body() dto: SocialOnboardDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    const { accessToken } = await this.authService.onboardSocialUser(dto.onboardToken, dto.name);
    res.cookie("access_token", accessToken, COOKIE_OPTIONS);
    return { ok: true };
  }
}
