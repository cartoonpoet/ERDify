import { Button, lightThemeClass } from "@lawkit/ui";
import "@lawkit/ui/style.css";
import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../../shared/api/auth.api";
import { useAuthStore } from "../../shared/stores/useAuthStore";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setToken = useAuthStore((s) => s.setToken);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { accessToken } = await login({ email, password });
      setToken(accessToken);
      navigate("/");
    } catch {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={lightThemeClass} style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
      <form
        onSubmit={handleSubmit}
        aria-label="로그인"
        style={{ display: "flex", flexDirection: "column", gap: 12, width: 320 }}
      >
        <h1 style={{ margin: 0 }}>ERDify 로그인</h1>
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        {error && <span role="alert">{error}</span>}
        <Button color="primary" size="medium" type="submit" disabled={loading}>
          {loading ? "로그인 중..." : "로그인"}
        </Button>
        <Link to="/register">계정이 없으신가요? 회원가입</Link>
      </form>
    </div>
  );
}
