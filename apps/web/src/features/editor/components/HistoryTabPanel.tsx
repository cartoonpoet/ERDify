import { useState } from "react";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import { useActivityFeed } from "@/features/editor/hooks/useActivityFeed";
import type { ActivityItem, VersionActivityItem, AiActivityItem } from "@/features/editor/hooks/useActivityFeed";
import * as css from "./activity-drawer.css";

const formatTime = (iso: string): string => {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHr < 24) return `${diffHr}시간 전`;
  if (diffDay === 1) return "어제";
  if (diffDay < 7) return `${diffDay}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR");
};

interface ActivityItemRowProps {
  item: ActivityItem;
  onRestore: (versionId: string) => void;
  onRevert: (sessionId: string) => void;
  isRestoring: boolean;
  isReverting: boolean;
  isDirty: boolean;
}

const ActivityItemRow = ({
  item,
  onRestore,
  onRevert,
  isRestoring,
  isReverting,
  isDirty,
}: ActivityItemRowProps) => {
  if (item.kind === "version") {
    const v = item as VersionActivityItem;
    const initial = v.createdByName ? v.createdByName.charAt(0).toUpperCase() : "?";
    const handleRestore = () => {
      if (
        isDirty &&
        !window.confirm(
          "저장되지 않은 변경사항이 있습니다. 복원하면 변경사항이 사라집니다. 계속하시겠습니까?"
        )
      ) {
        return;
      }
      onRestore(v.id);
    };

    return (
      <div className={css.activityItem}>
        <div className={`${css.itemIcon} ${css.itemIconHuman}`}>{initial}</div>
        <div className={css.itemBody}>
          <p className={css.itemSummary}>v{v.revision} 버전 저장</p>
          <div className={css.itemMeta}>
            {v.createdByName} · {formatTime(v.createdAt)}
          </div>
          <button
            className={css.itemRevertBtn}
            onClick={handleRestore}
            disabled={isRestoring}
          >
            복원
          </button>
        </div>
      </div>
    );
  }

  const s = item as AiActivityItem;
  const handleRevert = () => {
    if (
      !window.confirm(
        "이 AI 세션 이전으로 다이어그램을 되돌리겠습니까? 현재 변경사항이 사라질 수 있습니다."
      )
    ) {
      return;
    }
    onRevert(s.id);
  };

  return (
    <div className={css.activityItem}>
      <div className={`${css.itemIcon} ${css.itemIconAi}`}>AI</div>
      <div className={css.itemBody}>
        <p className={css.itemSummary}>{s.summary ?? "AI 활동"}</p>
        <div className={css.itemMeta}>AI · {formatTime(s.createdAt)}</div>
        {s.snapshotVersionId !== null && (
          <button
            className={css.itemRevertBtn}
            onClick={handleRevert}
            disabled={isReverting}
          >
            되돌리기
          </button>
        )}
      </div>
    </div>
  );
};

interface HistoryTabPanelProps {
  diagramId: string;
}

export const HistoryTabPanel = ({ diagramId }: HistoryTabPanelProps) => {
  const [showHuman, setShowHuman] = useState(true);
  const [showAi, setShowAi] = useState(true);

  const isDirty = useEditorStore((s) => s.isDirty);
  const { items, isLoading, restoreVersion, isRestoring, revertSession, isReverting } =
    useActivityFeed(diagramId);

  const filteredItems = items.filter((item) => {
    if (item.kind === "version") return showHuman;
    return showAi;
  });

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div className={css.filterRow}>
        <button
          className={`${css.chip}${showHuman ? ` ${css.chipOn}` : ""}`}
          onClick={() => setShowHuman((v) => !v)}
        >
          <span className={css.chipDot} style={{ background: "#60a5fa" }} />
          사람
        </button>
        <button
          className={`${css.chip}${showAi ? ` ${css.chipOn}` : ""}`}
          onClick={() => setShowAi((v) => !v)}
        >
          <span className={css.chipDot} style={{ background: "#a78bfa" }} />
          AI
        </button>
      </div>

      <div className={css.drawerBody}>
        {isLoading ? (
          <p className={css.emptyText}>불러오는 중…</p>
        ) : filteredItems.length === 0 ? (
          <p className={css.emptyText}>표시할 활동이 없습니다.</p>
        ) : (
          filteredItems.map((item) => (
            <ActivityItemRow
              key={`${item.kind}-${item.id}`}
              item={item}
              onRestore={restoreVersion}
              onRevert={revertSession}
              isRestoring={isRestoring}
              isReverting={isReverting}
              isDirty={isDirty}
            />
          ))
        )}
      </div>
    </div>
  );
};
