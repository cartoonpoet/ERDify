// apps/web/src/features/admin/components/ErrorReportSlideOver.tsx
import { useState } from "react";
import type { GroupedErrorReport, ApiErrorType } from "@/shared/api/errorReports.api";
import * as css from "../admin.css";

interface Props {
  report: GroupedErrorReport;
  onClose: () => void;
  onResolved: (path: string, errorType: ApiErrorType, note: string) => void;
}

export const ErrorReportSlideOver = ({ report, onClose, onResolved }: Props) => {
  const [note, setNote] = useState("");

  return (
    <div className={css.slideOverBackdrop} onClick={onClose}>
      <div className={css.slideOver} onClick={(e) => e.stopPropagation()}>
        <div className={css.slideOverHeader}>
          <div className={css.slideOverTitle}>에러 상세</div>
          <button type="button" className={css.slideOverClose} onClick={onClose}>✕</button>
        </div>

        <div className={css.slideOverBody}>
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap", alignItems: "center" }}>
            <span className={`${css.typeBadge} ${css.typeBadgeVariants[report.errorType]}`}>
              {report.errorType}
            </span>
            <span style={{ fontSize: "12px", color: "var(--color-text-secondary, #aaa)", wordBreak: "break-all" }}>
              {report.path}
            </span>
          </div>

          <div className={css.detailGrid}>
            <span className={css.detailLabel}>발생 횟수</span>
            <span className={css.detailValue}>{report.count}회</span>
            <span className={css.detailLabel}>첫 발생</span>
            <span className={css.detailValue}>{new Date(report.firstSeen).toLocaleString("ko-KR")}</span>
            <span className={css.detailLabel}>최근 발생</span>
            <span className={css.detailValue}>{new Date(report.lastSeen).toLocaleString("ko-KR")}</span>
          </div>

          <div className={css.noteLabel}>해결 메모 (선택)</div>
          <textarea
            className={css.noteTextarea}
            placeholder="원인 파악 후 메모..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className={css.slideOverFooter}>
          <button
            type="button"
            className={css.resolveConfirmBtn}
            onClick={() => onResolved(report.path, report.errorType, note)}
          >
            ✓ 해결 완료로 표시
          </button>
          <div className={css.resolveHint}>해결자 및 시각이 자동 기록됩니다</div>
        </div>
      </div>
    </div>
  );
};
