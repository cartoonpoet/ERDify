import { Button, lightThemeClass } from "@lawkit/ui";
import "@lawkit/ui/style.css";
import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../../shared/api/auth.api";
import { useAuthStore } from "../../shared/stores/useAuthStore";

export function RegisterPage() {
  const [name, setName] = useState("");
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
      const { accessToken } = await register({ name, email, password });
      setToken(accessToken);
      navigate("/");
    } catch {
      setError("회원가입에 실패했습니다. 이미 사용 중인 이메일일 수 있습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={lightThemeClass} style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
      <form
        onSubmit={handleSubmit}
        aria-label="회원가입"
        style={{ display: "flex", flexDirection: "column", gap: 12, width: 320 }}
      >
        <h1 style={{ margin: 0 }}>ERDify 회원가입</h1>
        <input
          type="text"
          placeholder="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="비밀번호 (8자 이상)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        {error && <span role="alert">{error}</span>}
        <Button color="primary" size="medium" type="submit" disabled={loading}>
          {loading ? "처리 중..." : "회원가입"}
        </Button>
        <Link to="/login">이미 계정이 있으신가요? 로그인</Link>
      </form>
    </div>
  );
}
