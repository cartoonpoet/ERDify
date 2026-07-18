import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { GroupedErrorReport, ApiErrorType, OccurrenceItem } from "@/shared/api/errorReports.api";
import { getErrorReportOccurrences } from "@/shared/api/errorReports.api";
import { queryKeys } from "@/shared/lib/queryKeys";
import * as css from "../admin.css";

interface Props {
  report: GroupedErrorReport;
  onClose: () => void;
  onResolved: (path: string, errorType: ApiErrorType, note: string) => void;
}

const formatJson = (raw: string | null): string => {
  if (!raw) return "";
  try { return JSON.stringify(JSON.parse(raw), null, 2); }
  catch { return raw; }
};

const formatForClaude = (report: GroupedErrorReport, occurrences: OccurrenceItem[]): string => {
  const header = [
    `## 에러 리포트 — [${report.errorType}] ${report.path}`,
    ``,
    `총 ${report.count}건 발생 | 첫 발생: ${new Date(report.firstSeen).toLocaleString("ko-KR")} | 최근: ${new Date(report.lastSeen).toLocaleString("ko-KR")}`,
    ``,
    `---`,
    ``,
  ].join("\n");

  const items = occurrences.map((occ, i) => {
    const lines = [
      `### [${i + 1}] ${new Date(occ.createdAt).toLocaleString("ko-KR")}`,
      ``,
      `- **사용자**: ${occ.userId ?? "(미인증)"}`,
    ];
    if (occ.pageName) lines.push(`- **페이지**: ${occ.pageName}`);
    lines.push(`- **URL**: ${occ.url}`);
    lines.push(`- **요청**: ${occ.requestMethod ?? "?"} ${report.path} (HTTP ${occ.httpStatus ?? "?"})`);
    if (occ.requestBody) {
      lines.push(`- **Request Body**:`);
      lines.push("```json");
      lines.push(formatJson(occ.requestBody));
      lines.push("```");
    }
    if (occ.requestParams) {
      lines.push(`- **Request Params**:`);
      lines.push("```json");
      lines.push(formatJson(occ.requestParams));
      lines.push("```");
    }
    if (occ.responseBody) {
      lines.push(`- **Response Body**:`);
      lines.push("```json");
      lines.push(formatJson(occ.responseBody));
      lines.push("```");
    }
    lines.push(`- **Browser**: ${occ.userAgent}`);
    lines.push(``);
    return lines.join("\n");
  });

  return header + items.join("\n---\n\n");
};

// occ.url = 브라우저 URL, apiPath = API 경로 (그룹의 path, 모든 occurrence가 동일)
const OccurrenceCard = ({ occ, apiPath }: { occ: OccurrenceItem; apiPath: string }) => (
  <div className={css.occurrenceCard}>
    <div className={css.occurrenceHeader}>
      <span>{new Date(occ.createdAt).toLocaleString("ko-KR")}</span>
      <span className={css.occurrenceUserId}>{occ.userId ?? "(미인증)"}</span>
    </div>
    {occ.pageName && (
      <div className={css.occurrencePageRow}>
        <strong>{occ.pageName}</strong>
        <br />
        <span style={{ fontSize: "10px" }}>{occ.url}</span>
      </div>
    )}
    {!occ.pageName && (
      <div className={css.occurrencePageRow} style={{ fontSize: "10px" }}>{occ.url}</div>
    )}
    <div className={css.occurrenceApiRow}>
      {occ.requestMethod ?? "?"} {apiPath} ({occ.httpStatus ?? "?"})
    </div>
    {occ.requestBody && (
      <>
        <div className={css.occurrenceSectionLabel}>Request Body</div>
        <pre className={css.occurrencePre}>{formatJson(occ.requestBody)}</pre>
      </>
    )}
    {occ.requestParams && (
      <>
        <div className={css.occurrenceSectionLabel}>Request Params</div>
        <pre className={css.occurrencePre}>{formatJson(occ.requestParams)}</pre>
      </>
    )}
    {occ.responseBody && (
      <>
        <div className={css.occurrenceSectionLabel}>Response Body</div>
        <pre className={css.occurrencePre}>{formatJson(occ.responseBody)}</pre>
      </>
    )}
    <div className={css.occurrencePageRow} style={{ marginTop: "6px", marginBottom: 0, fontSize: "10px" }}>
      {occ.userAgent}
    </div>
  </div>
);

export const ErrorReportSlideOver = ({ report, onClose, onResolved }: Props) => {
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: occurrences, isLoading } = useQuery({
    queryKey: queryKeys.errorReportOccurrences(report.errorType, report.path),
    queryFn: () => getErrorReportOccurrences({ errorType: report.errorType, path: report.path }),
  });

  const handleCopy = () => {
    const text = formatForClaude(report, occurrences ?? []);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => undefined);
  };

  return (
    // 배경 클릭 dismiss 전용 오버레이 — 키보드 사용자는 아래 닫기(✕) 버튼으로 닫는다.
    <div className={css.slideOverBackdrop} role="presentation" onClick={onClose}>
      {/* 배경으로의 클릭 버블링만 막는 래퍼라 인터랙티브 요소가 아니다 */}
      <div className={css.slideOver} role="presentation" onClick={(e) => e.stopPropagation()}>
        <div className={css.slideOverHeader}>
          <div className={css.slideOverTitle}>에러 상세</div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button type="button" className={css.copyBtn} onClick={handleCopy}>
              {copied ? "✓ 복사됨" : "Claude에게 복사"}
            </button>
            <button type="button" className={css.slideOverClose} onClick={onClose}>✕</button>
          </div>
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

          <div className={css.noteLabel} style={{ marginBottom: "8px" }}>개별 발생건</div>
          {isLoading && <div className={css.occurrenceLoadingText}>불러오는 중...</div>}
          {!isLoading && occurrences && (
            <div className={css.occurrenceList}>
              {occurrences.map((occ) => (
                <OccurrenceCard key={occ.id} occ={occ} apiPath={report.path} />
              ))}
            </div>
          )}

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
