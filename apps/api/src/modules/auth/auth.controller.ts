import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthService } from "./auth.service";
import type { UserProfile } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import type { JwtPayload } from "./strategies/jwt.strategy";
import type { ChangePasswordDto } from "./dto/change-password.dto";
import type { LoginDto } from "./dto/login.dto";
import type { RegisterDto } from "./dto/register.dto";
import type { UpdateProfileDto } from "./dto/update-profile.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  register(@Body() dto: RegisterDto): Promise<{ accessToken: string }> {
    return this.authService.register(dto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<{ accessToken: string }> {
    return this.authService.login(dto);
  }

  @Post("api-key")
  @UseGuards(JwtAuthGuard)
  generateApiKey(@CurrentUser() user: JwtPayload): { apiKey: string } {
    return this.authService.generateApiKey(user.sub, user.email);
  }

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
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadAvatar(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UserProfile> {
    return this.authService.uploadAvatar(user.sub, file);
  }
}
