import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ApiKey, Invite, OauthAccount, Organization, OrganizationMember, User } from "@erdify/db";
import { EmailModule } from "../email/email.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { FlexAuthGuard } from "./guards/flex-auth.guard";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { KakaoStrategy } from "./strategies/kakao.strategy";
import { NaverStrategy } from "./strategies/naver.strategy";
import { GoogleStrategy } from "./strategies/google.strategy";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, ApiKey, Invite, Organization, OrganizationMember, OauthAccount]),
    EmailModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>("JWT_SECRET");
        if (!secret) throw new Error("JWT_SECRET environment variable is required");
        return { secret, signOptions: { expiresIn: "7d" } };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, FlexAuthGuard, KakaoStrategy, NaverStrategy, GoogleStrategy],
  exports: [AuthService, JwtModule, FlexAuthGuard],
})
export class AuthModule {}
