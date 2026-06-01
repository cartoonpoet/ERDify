import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/shared/store/useAuthStore";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";
const SOCIAL_LOGIN_ENABLED = import.meta.env.VITE_SOCIAL_LOGIN_ENABLED === "true";

type SocialProvider = "kakao" | "naver" | "google";

interface UseSocialLoginReturn {
  socialLoading: SocialProvider | null;
  handleSocialLogin: (provider: SocialProvider) => void;
}

export const useSocialLogin = (setError: (msg: string | null) => void): UseSocialLoginReturn => {
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null);
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const navigate = useNavigate();
  const messageHandlerRef = useRef<((event: MessageEvent) => void) | null>(null);
  const popupPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (messageHandlerRef.current) {
        window.removeEventListener("message", messageHandlerRef.current);
      }
      if (popupPollRef.current) {
        clearInterval(popupPollRef.current);
      }
    };
  }, []);

  const handleSocialLogin = (provider: SocialProvider) => {
    if (!SOCIAL_LOGIN_ENABLED) return;
    setError(null);
    const apiOrigin = new URL(API_BASE_URL).origin;
    const left = Math.round(window.screenX + (window.outerWidth - 500) / 2);
    const top = Math.round(window.screenY + (window.outerHeight - 600) / 2);
    const popup = window.open(
      `${apiOrigin}/api/auth/${provider}`,
      "oauth-popup",
      `width=500,height=600,left=${left},top=${top}`
    );

    if (!popup) {
      setError("팝업이 차단되었습니다. 팝업 차단을 해제해 주세요.");
      return;
    }

    setSocialLoading(provider);

    const cleanup = () => {
      if (messageHandlerRef.current) {
        window.removeEventListener("message", messageHandlerRef.current);
        messageHandlerRef.current = null;
      }
      if (popupPollRef.current) {
        clearInterval(popupPollRef.current);
        popupPollRef.current = null;
      }
    };

    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "oauth-callback") return;

      const { status, token, message } = event.data;

      if (status === "success") {
        setAuthenticated(true);
        navigate("/");
      } else if (status === "onboard") {
        navigate("/social/onboarding", { state: { token } });
      } else if (status === "error") {
        setError(message ?? "소셜 로그인에 실패했습니다.");
      }

      setSocialLoading(null);
      cleanup();
    };

    messageHandlerRef.current = handler;
    window.addEventListener("message", handler);

    // 팝업이 메시지 없이 닫힌 경우(사용자 직접 닫기) 감지
    popupPollRef.current = setInterval(() => {
      if (popup.closed) {
        setSocialLoading(null);
        cleanup();
      }
    }, 500);
  };

  return { socialLoading, handleSocialLogin };
};
