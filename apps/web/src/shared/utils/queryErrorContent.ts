export type ErrorStatus = 403 | 404 | "5xx" | "network";

export const getErrorStatus = (error: unknown): ErrorStatus => {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 403) return 403;
  if (status === 404) return 404;
  if (status !== undefined && status >= 500) return "5xx";
  return "network";
};

export interface ErrorContent {
  icon: string;
  title: string;
  desc: string;
  retryable: boolean;
  guide: string;
}

export const ERROR_CONTENT: Record<ErrorStatus, ErrorContent> = {
  403: {
    icon: "🔒",
    title: "접근 권한이 없습니다",
    desc: "이 프로젝트를 볼 수 있는 권한이 없습니다. 관리자에게 문의하세요.",
    retryable: false,
    guide: "사이드바에서 다른 프로젝트를 선택하거나 관리자에게 문의하세요",
  },
  404: {
    icon: "🔍",
    title: "ERD 목록을 찾을 수 없습니다",
    desc: "이 프로젝트의 ERD 목록을 찾을 수 없습니다.",
    retryable: false,
    guide: "사이드바에서 다른 프로젝트를 선택해 주세요",
  },
  "5xx": {
    icon: "⚠️",
    title: "서버 오류",
    desc: "서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    retryable: true,
    guide: "문제가 지속되면 페이지를 새로고침해 주세요",
  },
  network: {
    icon: "📡",
    title: "연결 오류",
    desc: "인터넷 연결을 확인한 후 다시 시도해 주세요.",
    retryable: true,
    guide: "인터넷 연결을 확인해 주세요",
  },
};
