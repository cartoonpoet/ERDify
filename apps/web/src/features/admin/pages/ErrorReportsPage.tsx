// apps/web/src/features/admin/pages/ErrorReportsPage.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getErrorReports, resolveErrorReport } from "@/shared/api/errorReports.api";
import type { GroupedErrorReport, ApiErrorType } from "@/shared/api/errorReports.api";
import { queryKeys } from "@/shared/lib/queryKeys";
import { ErrorReportSlideOver } from "../components/ErrorReportSlideOver";
import * as css from "../admin.css";

type Tab = "unresolved" | "resolved";

export const ErrorReportsPage = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("unresolved");
  const [typeFilter, setTypeFilter] = useState<ApiErrorType | undefined>(undefined);
  const [selected, setSelected] = useState<GroupedErrorReport | null>(null);

  const { data } = useQuery({
    queryKey: queryKeys.adminErrorReports(tab, typeFilter),
    queryFn: () =>
      getErrorReports({
        resolved: tab === "resolved",
        ...(typeFilter !== undefined ? { type: typeFilter } : {}),
      }),
  });

  const resolve = useMutation({
    mutationFn: resolveErrorReport,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.adminErrorReportsAll() });
      setSelected(null);
    },
  });

  const groups = data?.groups ?? [];
  const stats = data?.stats;

  const unresolvedCount = groups.filter((g) => !g.resolved).length;

  return (
    <div className={css.page}>
      <div className={css.header}>
        <div className={css.pageTitle}>에러 리포트</div>
        {stats && (
          <div className={css.statsRow}>
            <span className={css.statChipCritical}>5xx: {stats["5xx"]}</span>
            <span className={css.statChipCritical}>net: {stats.network}</span>
            <span className={css.statChip}>403: {stats["403"]}</span>
            <span className={css.statChip}>404: {stats["404"]}</span>
          </div>
        )}
      </div>

      <div className={css.tabRow}>
        <button
          type="button"
          className={tab === "unresolved" ? css.tabActive : css.tab}
          onClick={() => setTab("unresolved")}
        >
          미해결 ({unresolvedCount})
        </button>
        <button
          type="button"
          className={tab === "resolved" ? css.tabActive : css.tab}
          onClick={() => setTab("resolved")}
        >
          해결됨
        </button>
        <div style={{ flex: 1 }} />
        {(["5xx", "network", "403", "404"] as ApiErrorType[]).map((t) => (
          <button
            key={t}
            type="button"
            className={typeFilter === t ? css.tabActive : css.tab}
            onClick={() => setTypeFilter(typeFilter === t ? undefined : t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className={css.list}>
        {groups.map((report) => (
          <div
            key={`${report.errorType}:${report.path}`}
            className={`${css.errorRow} ${css.errorRowBorderVariants[report.errorType]}`}
            onClick={() => setSelected(report)}
          >
            <span className={`${css.typeBadge} ${css.typeBadgeVariants[report.errorType]}`}>
              {report.errorType}
            </span>
            <div className={css.rowMeta}>
              <div className={css.rowPath}>{report.path}</div>
              <div className={css.rowTime}>
                첫 발생: {new Date(report.firstSeen).toLocaleString("ko-KR")} ·
                최근: {new Date(report.lastSeen).toLocaleString("ko-KR")}
              </div>
            </div>
            <span className={report.count > 1 ? css.countBadge : css.countBadgeMuted}>
              ×{report.count}
            </span>
            <button
              type="button"
              className={css.resolveBtn}
              onClick={(e) => {
                e.stopPropagation();
                setSelected(report);
              }}
            >
              해결 →
            </button>
          </div>
        ))}
      </div>

      {selected && (
        <ErrorReportSlideOver
          report={selected}
          onClose={() => setSelected(null)}
          onResolved={(path, errorType, note) =>
            resolve.mutate({
              path,
              errorType,
              ...(note ? { note } : {}),
            })
          }
        />
      )}
    </div>
  );
};
