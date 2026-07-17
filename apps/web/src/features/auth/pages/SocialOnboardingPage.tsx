import { useState, type SubmitEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { completeOnboarding } from "@/shared/api/auth.api";
import { useAuthStore } from "@/shared/store/useAuthStore";
import { Button, Input } from "@/components";
import {
  page, card, brand, brandLogo, form, formError,
  onboardTitle, onboardSubtitle,
} from "./auth-page.css";

export const SocialOnboardingPage = () => {
  const location = useLocation();
  const token: string | undefined = (location.state as { token?: string } | null)?.token;

  const navigate = useNavigate();
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await completeOnboarding({ onboardToken: token, name });
      setAuthenticated(true);
      navigate("/");
    } catch {
      setError("이름 등록에 실패했습니다. 다시 시도해 주세요.");
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
        <p className={onboardTitle}>거의 다 왔어요!</p>
        <p className={onboardSubtitle}>서비스 이용을 위해 이름을 입력해 주세요.</p>
        <form className={form} onSubmit={handleSubmit} aria-label="온보딩">
          <Input
            label="이름"
            type="text"
            placeholder="이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
          {error && <p className={formError}>{error}</p>}
          <Button
            variant="primary"
            size="lg"
            type="submit"
            disabled={loading || !name.trim()}
            style={{ width: "100%" }}
          >
            {loading ? "처리 중..." : "시작하기"}
          </Button>
        </form>
      </div>
    </div>
  );
};
