import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { sendVerification, verifyCode, getInvite, register } from "@/api/auth.api";
import { useAuthStore } from "@/store/useAuthStore";
import { Button, Input } from "@/components";
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
  const navigate = useNavigate();
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);

  // 이메일 인증 상태
  const [email, setEmail] = useState("");
  const [verifiedToken, setVerifiedToken] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // 나머지 필드
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const strength = getStrength(password);
  const isInvite = !!searchParams.get("inviteToken");

  // 초대 토큰으로 진입 시 이메일 자동 인증
  useEffect(() => {
    const inviteToken = searchParams.get("inviteToken");
    if (!inviteToken) return;
    getInvite(inviteToken)
      .then(({ email: inviteEmail, verifiedToken: token }) => {
        setEmail(inviteEmail);
        setVerifiedToken(token);
      })
      .catch(() => setCodeError("유효하지 않거나 만료된 초대 링크입니다."));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 재전송 쿨다운 타이머
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleSendCode = async () => {
    if (!email) return;
    setSendingCode(true);
    setCodeError(null);
    try {
      await sendVerification(email);
      setCodeSent(true);
      setResendCooldown(60);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setCodeError(status === 409
        ? "이미 가입된 이메일입니다. 로그인해 주세요."
        : "인증 코드 발송에 실패했습니다. 이메일을 확인해주세요."
      );
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code) return;
    setVerifyingCode(true);
    setCodeError(null);
    try {
      const { verifiedToken: token } = await verifyCode(email, code);
      setVerifiedToken(token);
    } catch {
      setCodeError("인증 코드가 올바르지 않거나 만료되었습니다.");
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!verifiedToken) { setError("이메일 인증을 완료해주세요."); return; }
    if (password !== confirmPassword) { setError("비밀번호가 일치하지 않습니다."); return; }
    setError(null);
    setLoading(true);
    try {
      await register({ name, email, password, ...(phone ? { phone } : {}), verifiedToken });
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
          {/* 이메일 + 인증 */}
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <Input
                  label="이메일"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setVerifiedToken(null);
                    setCodeSent(false);
                    setCode("");
                    setCodeError(null);
                  }}
                  required
                  disabled={isInvite || !!verifiedToken}
                />
              </div>
              {!verifiedToken && (
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={handleSendCode}
                  disabled={sendingCode || !email || resendCooldown > 0}
                  style={{ flexShrink: 0, marginBottom: 2 }}
                >
                  {sendingCode ? "발송 중..." : resendCooldown > 0 ? `재전송 (${resendCooldown}s)` : codeSent ? "재전송" : "인증 코드 발송"}
                </Button>
              )}
            </div>

            {verifiedToken ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 13, color: "#16a34a", fontWeight: 600 }}>
                <span>✓</span>
                <span>{isInvite ? "초대로 인증 완료" : "이메일 인증 완료"}</span>
              </div>
            ) : codeSent && (
              <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <Input
                    label="인증 코드"
                    type="text"
                    placeholder="6자리 코드 입력"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    {...(codeError ? { error: codeError } : {})}
                  />
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={handleVerifyCode}
                  disabled={verifyingCode || code.length !== 6}
                  style={{ flexShrink: 0, marginBottom: codeError ? 22 : 2 }}
                >
                  {verifyingCode ? "확인 중..." : "확인"}
                </Button>
              </div>
            )}
            {codeError && !codeSent && (
              <p style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>{codeError}</p>
            )}
          </div>

          <Input
            label="이름"
            type="text"
            placeholder="홍길동"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="전화번호 (선택)"
            type="tel"
            placeholder="010-0000-0000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <div>
            <Input
              label="비밀번호"
              type="password"
              placeholder="8자 이상"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

          <Button variant="primary" size="lg" type="submit" disabled={loading || !verifiedToken} style={{ width: "100%" }}>
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
