import { useState, type SubmitEvent } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "@/shared/api/auth.api";
import { Button, Input } from "@/components";
import {
  page, card, brand, brandLogo, tagline, form, authLink, authLinkAnchor,
} from "./auth-page.css";

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch {
      setError("요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
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
        <div className={tagline}>비밀번호 찾기</div>

        {sent ? (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <p style={{ fontSize: 14, color: "#1c2b33", lineHeight: 1.7, margin: "0 0 8px" }}>
              <strong>{email}</strong>로 비밀번호 재설정 링크를 발송했습니다.
            </p>
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
              이메일이 오지 않으면 스팸함을 확인해주세요.
            </p>
          </div>
        ) : (
          <form className={form} onSubmit={handleSubmit} aria-label="비밀번호 찾기">
            <Input
              label="가입한 이메일"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
            {error && <p style={{ fontSize: 13, color: "#ef4444", margin: 0 }}>{error}</p>}
            <Button variant="primary" size="lg" type="submit" disabled={loading} style={{ width: "100%" }}>
              {loading ? "발송 중..." : "재설정 링크 발송"}
            </Button>
          </form>
        )}

        <div className={authLink}>
          <Link to="/login" className={authLinkAnchor}>로그인으로 돌아가기</Link>
        </div>
      </div>
    </div>
  );
};
