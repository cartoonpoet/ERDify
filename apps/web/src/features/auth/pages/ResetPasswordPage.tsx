import { useState, type SubmitEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "@/shared/api/auth.api";
import { Button, Input } from "@/components";
import {
  page, card, brand, brandLogo, tagline, form, authLink, authLinkAnchor,
  strengthBars, strengthBar, strengthBarFilled,
} from "./auth-page.css";

const getStrength = (pw: string) => {
  if (pw.length === 0) return 0;
  if (pw.length < 6) return 1;
  if (pw.length < 8) return 2;
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) return 4;
  return 3;
};

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = getStrength(password);

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password !== confirmPassword) { setError("비밀번호가 일치하지 않습니다."); return; }
    setError(null);
    setLoading(true);
    try {
      await resetPassword(token, password);
      navigate("/login?reason=password-reset");
    } catch {
      setError("링크가 만료되었거나 유효하지 않습니다. 비밀번호 찾기를 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className={page}>
        <div className={card}>
          <div className={brand}>
            <img src="/logo.svg" alt="ERDify" className={brandLogo} />
          </div>
          <div className={tagline}>유효하지 않은 링크입니다</div>
          <div className={authLink}>
            <Link to="/forgot-password" className={authLinkAnchor}>비밀번호 찾기로 돌아가기</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={page}>
      <div className={card}>
        <div className={brand}>
          <img src="/logo.svg" alt="ERDify" className={brandLogo} />
        </div>
        <div className={tagline}>새 비밀번호 설정</div>

        <form className={form} onSubmit={handleSubmit} aria-label="비밀번호 재설정">
          <div>
            <Input
              label="새 비밀번호"
              type="password"
              placeholder="8자 이상"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoFocus
            />
            {password.length > 0 && (
              <div className={strengthBars}>
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={[strengthBar, strength >= level ? strengthBarFilled : undefined].filter(Boolean).join(" ")}
                  />
                ))}
              </div>
            )}
          </div>

          <Input
            label="비밀번호 확인"
            type="password"
            placeholder="비밀번호 재입력"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            {...(confirmPassword && password !== confirmPassword ? { error: "비밀번호가 일치하지 않습니다." } : {})}
          />

          {error && <p style={{ fontSize: 13, color: "#ef4444", margin: 0 }}>{error}</p>}

          <Button variant="primary" size="lg" type="submit" disabled={loading} style={{ width: "100%" }}>
            {loading ? "처리 중..." : "비밀번호 변경"}
          </Button>
        </form>

        <div className={authLink}>
          <Link to="/login" className={authLinkAnchor}>로그인으로 돌아가기</Link>
        </div>
      </div>
    </div>
  );
};
