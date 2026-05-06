import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { register } from "../../../shared/api/auth.api";
import { useAuthStore } from "../../../shared/stores/useAuthStore";
import { Button, Input } from "../../../design-system";
import {
  page, card, brand, brandLogo, tagline, form,
  authLink, authLinkAnchor, strengthBars, strengthBar, strengthBarFilled,
} from "./auth-page.css";

const getStrength = (pw: string) => {
  if (pw.length === 0) return 0;
  if (pw.length < 6) return 1;
  if (pw.length < 8) return 2;
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) return 4;
  return 3;
};

export const RegisterPage = () => {
  const [searchParams] = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(searchParams.get("inviteEmail") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const navigate = useNavigate();

  const strength = getStrength(password);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register({ name, email, password });
      setAuthenticated(true);
      navigate("/");
    } catch {
      setError("회원가입에 실패했습니다. 이미 사용 중인 이메일일 수 있습니다.");
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
        <div className={tagline}>팀과 함께 스키마를 관리하세요</div>
        <form className={form} onSubmit={handleSubmit} aria-label="회원가입">
          <Input
            label="이름"
            type="text"
            placeholder="홍길동"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="이메일"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div>
            <Input
              label="비밀번호"
              type="password"
              placeholder="8자 이상"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              {...(error ? { error } : {})}
              required
              minLength={8}
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
          <Button variant="primary" size="lg" type="submit" disabled={loading} style={{ width: "100%" }}>
            {loading ? "처리 중..." : "시작하기"}
          </Button>
        </form>
        <div className={authLink}>
          이미 계정이 있으신가요?{" "}
          <Link to="/login" className={authLinkAnchor}>로그인</Link>
        </div>
      </div>
    </div>
  );
};
