import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, Profile } from "passport-google-oauth20";

export interface GoogleValidateResult {
  providerId: string;
  providerEmail: string | undefined;
  name: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(configService: ConfigService) {
    const clientID = configService.get<string>("GOOGLE_CLIENT_ID");
    const clientSecret = configService.get<string>("GOOGLE_CLIENT_SECRET");
    const callbackURL = configService.get<string>("GOOGLE_CALLBACK_URL");
    if (!clientID) throw new Error("GOOGLE_CLIENT_ID environment variable is required");
    if (!clientSecret) throw new Error("GOOGLE_CLIENT_SECRET environment variable is required");
    if (!callbackURL) throw new Error("GOOGLE_CALLBACK_URL environment variable is required");
    super({ clientID, clientSecret, callbackURL, scope: ["email", "profile"] });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (error: any, user?: GoogleValidateResult) => void,
  ): void {
    const providerId = String(profile.id);
    const providerEmail: string | undefined = profile.emails?.[0]?.value ?? undefined;
    const name: string = profile.displayName ?? "";
    done(null, { providerId, providerEmail, name });
  }
}
