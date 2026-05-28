import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, Profile } from "passport-kakao";

export interface KakaoValidateResult {
  providerId: string;
  providerEmail: string | undefined;
  name: string;
}

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, "kakao") {
  constructor(configService: ConfigService) {
    const clientID = configService.get<string>("KAKAO_CLIENT_ID");
    const clientSecret = configService.get<string>("KAKAO_CLIENT_SECRET");
    const callbackURL = configService.get<string>("KAKAO_CALLBACK_URL");
    if (!clientID) throw new Error("KAKAO_CLIENT_ID environment variable is required");
    if (!callbackURL) throw new Error("KAKAO_CALLBACK_URL environment variable is required");
    super({ clientID, clientSecret, callbackURL });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (error: any, user?: KakaoValidateResult) => void,
  ): void {
    const providerId = String(profile.id);
    const kakaoAccount = (profile._json as any)?.kakao_account;
    const providerEmail: string | undefined = kakaoAccount?.email ?? undefined;
    const name: string =
      (profile.displayName as string | undefined) ??
      (kakaoAccount?.profile?.nickname as string | undefined) ??
      "";
    done(null, { providerId, providerEmail, name });
  }
}
