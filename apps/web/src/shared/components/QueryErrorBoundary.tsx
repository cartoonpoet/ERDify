import { Component, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { getErrorStatus, ERROR_CONTENT } from "@/shared/utils/queryErrorContent";
import { reportError } from "@/shared/services/errorReporter";
import * as css from "./query-error-boundary.css";

type FallbackProps = {
  error: unknown;
  variant: "page" | "inline";
  backLabel: string;
  backPath: string;
  onRetry: () => void;
};

const ErrorFallback = ({ error, variant, backLabel, backPath, onRetry }: FallbackProps) => {
  const navigate = useNavigate();
  const status = getErrorStatus(error);
  const { icon, title, desc, retryable, guide } = ERROR_CONTENT[status];

  return (
    <div className={variant === "page" ? css.pageFallback : css.inlineFallback}>
      <div className={css.icon}>{icon}</div>
      <div className={css.title}>{title}</div>
      <div className={css.desc}>{desc}</div>
      {variant === "page" ? (
        <button type="button" className={css.actionBtn} onClick={() => { onRetry(); navigate(backPath); }}>
          {backLabel}
        </button>
      ) : (
        <>
          {retryable && (
            <button type="button" className={css.actionBtn} onClick={onRetry}>
              다시 시도
            </button>
          )}
          <div className={css.guide}>{guide}</div>
        </>
      )}
    </div>
  );
};

type ClassProps = {
  children: ReactNode;
  variant: "page" | "inline";
  backLabel: string;
  backPath: string;
  onReset: () => void;
};
type State = { hasError: boolean; error: unknown };

class QueryErrorBoundaryClass extends Component<ClassProps, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown): void {
    const path = (error as { config?: { url?: string } })?.config?.url ?? window.location.pathname;
    reportError(error, { path, url: window.location.href });
  }

  render() {
    if (this.state.hasError) {
      const handleRetry = () => {
        this.props.onReset();
        this.setState({ hasError: false, error: null });
      };
      return (
        <ErrorFallback
          error={this.state.error}
          variant={this.props.variant}
          backLabel={this.props.backLabel}
          backPath={this.props.backPath}
          onRetry={handleRetry}
        />
      );
    }
    return this.props.children;
  }
}

type PublicProps = {
  children: ReactNode;
  variant: "page" | "inline";
  backLabel?: string;
  backPath?: string;
};

export const QueryErrorBoundary = ({ children, variant, backLabel, backPath }: PublicProps) => {
  const { reset } = useQueryErrorResetBoundary();
  return (
    <QueryErrorBoundaryClass
      variant={variant}
      backLabel={backLabel ?? "홈으로 이동"}
      backPath={backPath ?? "/"}
      onReset={reset}
    >
      {children}
    </QueryErrorBoundaryClass>
  );
};
