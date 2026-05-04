import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { AuthService } from "../auth.service";
import type { JwtPayload } from "../strategies/jwt.strategy";

@Injectable()
export class FlexAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();

    // 1. HttpOnly 쿠키 JWT (웹 앱)
    const cookieToken = (req.cookies as Record<string, string> | undefined)?.["access_token"];
    if (cookieToken) {
      const user = this.verifyJwt(cookieToken);
      if (user) { req.user = user; return true; }
    }

    // 2. Authorization: Bearer <token>
    const auth = req.headers["authorization"];
    if (typeof auth === "string" && auth.startsWith("Bearer ")) {
      const token = auth.slice(7);

      // erd_ prefix → DB 해시 조회 (MCP/API 클라이언트)
      if (token.startsWith("erd_")) {
        const user = await this.authService.validateApiKey(token);
        if (user) { req.user = user; return true; }
        throw new UnauthorizedException("Invalid API key");
      }

      // 일반 JWT Bearer (레거시 클라이언트 호환)
      const user = this.verifyJwt(token);
      if (user) { req.user = user; return true; }
    }

    throw new UnauthorizedException();
  }

  private verifyJwt(token: string): JwtPayload | null {
    try {
      return this.jwtService.verify<JwtPayload>(token, {
        // JWT_SECRET is validated at startup — safe to assert
        secret: this.configService.get<string>("JWT_SECRET")!,
      });
    } catch {
      return null;
    }
  }
}
