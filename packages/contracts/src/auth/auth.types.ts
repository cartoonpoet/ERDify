export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
}

export interface SocialOnboardPayload {
  onboardToken: string;
  name: string;
}

export interface SocialOnboardTokenPayload {
  sub: string;
  email?: string;
  provider: string;
  providerId: string;
  purpose: 'social-onboard';
}

export type OAuthProvider = 'kakao' | 'naver' | 'google';

export type OAuthStatus = 'success' | 'onboard' | 'error';
