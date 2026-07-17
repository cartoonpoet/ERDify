import { useState, type SubmitEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { login } from "@/shared/api/auth.api";
import { useAuthStore } from "@/shared/store/useAuthStore";
import { Button, Input } from "@/components";
import { useSocialLogin } from "@/features/auth/hooks/useSocialLogin";
import {
  page, card, brand, brandLogo, tagline, form, authLink, authLinkAnchor, sessionBanner,
  socialDivider, socialButtonContainer, socialButton, kakaoButton, naverButton, googleButton,
  socialComingSoonBadge,
} from "./auth-page.css";

const SOCIAL_LOGIN_ENABLED = import.meta.env.VITE_SOCIAL_LOGIN_ENABLED === "true";

export const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isSessionExpired = searchParams.get("reason") === "expired";
  const isPasswordReset = searchParams.get("reason") === "password-reset";

  const { socialLoading, handleSocialLogin } = useSocialLogin(setError);

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      setAuthenticated(true);
      navigate("/");
    } catch {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={page}>
      <div className={card}>
        <div className={brand}>
          <img src="/logo.svg" alt="ERDify" className={brandLogo} />
        </div>
        {isSessionExpired && (
          <div className={sessionBanner}>
            세션이 만료되었습니다. 다시 로그인해 주세요.
          </div>
        )}
        {isPasswordReset && (
          <div className={sessionBanner} style={{ color: "#16a34a", borderColor: "#bbf7d0", background: "#f0fdf4" }}>
            비밀번호가 재설정되었습니다. 새 비밀번호로 로그인해 주세요.
          </div>
        )}
        <div className={tagline}>AI와 함께, 팀과 함께 스키마를 관리하세요</div>
        <form className={form} onSubmit={handleSubmit} aria-label="로그인">
          <Input
            label="이메일"
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="비밀번호"
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            {...(error ? { error } : {})}
            required
            minLength={8}
          />
          <Button variant="primary" size="lg" type="submit" disabled={loading} style={{ width: "100%" }}>
            {loading ? "로그인 중..." : "로그인"}
          </Button>
        </form>

        <div className={socialDivider}>또는 소셜 로그인</div>

        <div className={socialButtonContainer}>
          <button
            type="button"
            className={`${socialButton} ${kakaoButton}`}
            disabled={!SOCIAL_LOGIN_ENABLED || socialLoading !== null || loading}
            onClick={() => SOCIAL_LOGIN_ENABLED && handleSocialLogin("kakao")}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path
                d="M9 1C4.582 1 1 3.896 1 7.455c0 2.282 1.522 4.285 3.82 5.43L3.9 16.08a.25.25 0 0 0 .373.272L8.37 13.88c.207.017.416.027.63.027 4.418 0 8-2.896 8-6.452C17 3.896 13.418 1 9 1Z"
                fill="#191919"
              />
            </svg>
            {socialLoading === "kakao" ? "처리 중..." : "카카오로 계속하기"}
            {!SOCIAL_LOGIN_ENABLED && <span className={socialComingSoonBadge}>준비중</span>}
          </button>

          <button
            type="button"
            className={`${socialButton} ${naverButton}`}
            disabled={!SOCIAL_LOGIN_ENABLED || socialLoading !== null || loading}
            onClick={() => SOCIAL_LOGIN_ENABLED && handleSocialLogin("naver")}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <text x="3" y="14" fontFamily="Arial, sans-serif" fontSize="13" fontWeight="bold" fill="#FFFFFF">N</text>
            </svg>
            {socialLoading === "naver" ? "처리 중..." : "네이버로 계속하기"}
            {!SOCIAL_LOGIN_ENABLED && <span className={socialComingSoonBadge}>준비중</span>}
          </button>

          <button
            type="button"
            className={`${socialButton} ${googleButton}`}
            disabled={!SOCIAL_LOGIN_ENABLED || socialLoading !== null || loading}
            onClick={() => SOCIAL_LOGIN_ENABLED && handleSocialLogin("google")}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4" />
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853" />
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05" />
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335" />
            </svg>
            {socialLoading === "google" ? "처리 중..." : "구글로 계속하기"}
            {!SOCIAL_LOGIN_ENABLED && <span className={socialComingSoonBadge}>준비중</span>}
          </button>
        </div>

        <div className={authLink}>
          <Link to="/forgot-password" className={authLinkAnchor}>비밀번호를 잊으셨나요?</Link>
        </div>
        <div className={authLink}>
          계정이 없으신가요?{" "}
          <Link to="/register" className={authLinkAnchor}>회원가입</Link>
        </div>
      </div>
    </div>
  );
};
