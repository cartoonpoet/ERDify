import { useState } from "react";
import { useMcpActivity } from "../hooks/useMcpActivity";
import type { McpSessionResponse } from "../../../shared/api/mcp-sessions.api";
import * as css from "./mcp-activity-drawer.css";

interface McpActivityDrawerProps {
  diagramId: string;
  seenAt: number | null; // localStorage timestamp — sessions newer than this are "new"
  onClose: () => void;
}

// Format relative time (방금 전, N분 전, N시간 전, 어제, N일 전, date string)
const formatTime = (iso: string): string => {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return "어제";
  if (diffDay < 7) return `${diffDay}일 전`;
  return date.toLocaleDateString();
};

interface SessionItemProps {
  session: McpSessionResponse;
  isNew: boolean;
  onRevert: (id: string) => void;
  isReverting: boolean;
}

const SessionItem = ({ session, isNew, onRevert, isReverting }: SessionItemProps) => {
  const [expanded, setExpanded] = useState(isNew);

  return (
    <div className={isNew ? css.sessionItemNew : css.sessionItem}>
      {isNew ? (
        <div className={css.sessionTimestampNew}>
          <span className={css.newDot} />
          <span className={css.newTimestampText}>{formatTime(session.createdAt)}</span>
        </div>
      ) : (
        <div className={css.sessionTimestamp}>{formatTime(session.createdAt)}</div>
      )}

      <div className={isNew ? css.sessionSummary : css.sessionSummaryOld}>
        {session.summary ?? "AI 활동"}
      </div>

      {expanded && session.toolCalls.length > 0 && (
        <div className={css.toolCallList}>
          {session.toolCalls.map((tc, i) => (
            <div key={i} className={css.toolCallItem}>
              • {tc.summary}
            </div>
          ))}
        </div>
      )}

      <div className={css.sessionActions}>
        {session.toolCalls.length > 0 && (
          <button className={css.toggleBtn} onClick={() => setExpanded((v) => !v)}>
            {expanded ? "상세 접기 ▲" : "상세 보기 ▼"}
          </button>
        )}
        <div className={css.spacer} />
        <button
          className={css.revertBtn}
          disabled={isReverting}
          onClick={() => {
            if (window.confirm("이 세션 이전 상태로 되돌립니다. 계속하시겠습니까?")) {
              onRevert(session.id);
            }
          }}
        >
          되돌리기
        </button>
      </div>
    </div>
  );
};

export const McpActivityDrawer = ({ diagramId, seenAt, onClose }: McpActivityDrawerProps) => {
  const { sessions, isLoading, revertSession, isReverting } = useMcpActivity(diagramId);

  const newCount = sessions.filter(
    (s) => seenAt === null || new Date(s.createdAt).getTime() > seenAt
  ).length;

  return (
    <div className={css.drawer}>
      <div className={css.drawerHeader}>
        <div className={css.drawerTitleGroup}>
          <span>🤖</span>
          <h3 className={css.drawerTitle}>AI 활동</h3>
          {newCount > 0 && <span className={css.newBadge}>{newCount} 새로운</span>}
        </div>
        <button className={css.closeBtn} onClick={onClose} aria-label="닫기">
          ✕
        </button>
      </div>

      <div className={css.drawerBody}>
        {isLoading ? (
          <div className={css.emptyText}>불러오는 중…</div>
        ) : sessions.length === 0 ? (
          <div className={css.emptyText}>AI 활동 기록이 없습니다.</div>
        ) : (
          sessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              isNew={seenAt === null || new Date(session.createdAt).getTime() > seenAt}
              onRevert={revertSession}
              isReverting={isReverting}
            />
          ))
        )}
      </div>
    </div>
  );
};
