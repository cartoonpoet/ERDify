import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../../../shared/api/auth.api";
import { useAuthStore } from "../../../shared/stores/useAuthStore";
import { Button, Input } from "../../../design-system";
import {
  page, card, brand, brandLogo, tagline, form, authLink, authLinkAnchor,
} from "./auth-page.css";

export const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
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
        <div className={authLink}>
          계정이 없으신가요?{" "}
          <Link to="/register" className={authLinkAnchor}>회원가입</Link>
        </div>
      </div>
    </div>
  );
};
