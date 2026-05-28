import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, Profile } from "passport-naver-v2";

export interface NaverValidateResult {
  providerId: string;
  providerEmail: string | undefined;
  name: string;
}

@Injectable()
export class NaverStrategy extends PassportStrategy(Strategy, "naver") {
  constructor(configService: ConfigService) {
    const clientID = configService.get<string>("NAVER_CLIENT_ID");
    const clientSecret = configService.get<string>("NAVER_CLIENT_SECRET");
    const callbackURL = configService.get<string>("NAVER_CALLBACK_URL");
    if (!clientID) throw new Error("NAVER_CLIENT_ID environment variable is required");
    if (!clientSecret) throw new Error("NAVER_CLIENT_SECRET environment variable is required");
    if (!callbackURL) throw new Error("NAVER_CALLBACK_URL environment variable is required");
    super({ clientID, clientSecret, callbackURL });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (error: any, user?: NaverValidateResult) => void,
  ): void {
    const providerId = String(profile.id);
    const providerEmail: string | undefined = profile.email ?? undefined;
    const name: string = profile.name ?? profile.nickname ?? "";
    done(null, { providerId, providerEmail, name });
  }
}
