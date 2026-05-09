import { Component, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import * as css from "./query-error-boundary.css";

type ErrorStatus = 403 | 404 | "5xx" | "network";

const getErrorStatus = (error: unknown): ErrorStatus => {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 403) return 403;
  if (status === 404) return 404;
  if (status !== undefined && status >= 500) return "5xx";
  return "network";
};

const ERROR_CONTENT: Record<ErrorStatus, { icon: string; title: string; desc: string }> = {
  403: { icon: "🔒", title: "접근 권한이 없습니다", desc: "접근 권한이 없는 다이어그램입니다." },
  404: { icon: "🔍", title: "존재하지 않습니다", desc: "존재하지 않거나 삭제된 다이어그램입니다." },
  "5xx": { icon: "⚠️", title: "서버 오류", desc: "서버에 일시적인 문제가 발생했습니다." },
  network: { icon: "📡", title: "연결 오류", desc: "네트워크 연결을 확인해 주세요." },
};

const ErrorFallback = ({ error, variant }: { error: unknown; variant: "page" | "inline" }) => {
  const navigate = useNavigate();
  const status = getErrorStatus(error);
  const { icon, title, desc } = ERROR_CONTENT[status];
  return (
    <div className={variant === "page" ? css.pageFallback : css.inlineFallback}>
      <div className={css.icon}>{icon}</div>
      <div className={css.title}>{title}</div>
      <div className={css.desc}>{desc}</div>
      <button type="button" className={css.backBtn} onClick={() => navigate(-1)}>돌아가기</button>
    </div>
  );
};

type Props = { children: ReactNode; variant: "page" | "inline" };
type State = { hasError: boolean; error: unknown };

export class QueryErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} variant={this.props.variant} />;
    }
    return this.props.children;
  }
}
