import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export const OAuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const status = searchParams.get("status") ?? undefined;
    const token = searchParams.get("token") ?? undefined;
    const message = searchParams.get("message") ?? undefined;

    if (window.opener) {
      window.opener.postMessage(
        { type: "oauth-callback", status, token, message },
        window.location.origin
      );
      window.close();
    } else {
      navigate("/login", { replace: true });
    }
  }, [navigate, searchParams]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <p style={{ fontSize: "14px", color: "#5D6C7B" }}>인증 처리 중...</p>
    </div>
  );
};
