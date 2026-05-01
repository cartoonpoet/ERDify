import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { getPublicDiagram } from "../../../shared/api/diagrams.api";
import { useEditorStore } from "../../editor/stores/useEditorStore";
import { EditorCanvas } from "../../editor/components/EditorCanvas";
import { Skeleton } from "../../../design-system/Skeleton";
import * as css from "./shared-diagram-page.css";

export const SharedDiagramPage = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const { setDocument, setCanEdit } = useEditorStore();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["public-diagram", shareToken],
    queryFn: () => getPublicDiagram(shareToken!),
    enabled: !!shareToken,
    retry: false,
  });

  useEffect(() => {
    if (data) {
      setDocument(data.content);
      setCanEdit(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);

  if (isLoading) {
    return (
      <div className={css.root}>
        <div className={css.topbar}>
          <Skeleton width={160} height={14} />
          <Skeleton width={60} height={20} />
        </div>
        <div className={css.content}>
          <Skeleton style={{ flex: 1, borderRadius: 0 }} />
        </div>
      </div>
    );
  }

  if (isError) {
    const status = (error as AxiosError)?.response?.status;
    return (
      <div className={css.errorPage}>
        <div className={css.errorTitle}>
          {status === 403 ? "링크가 만료되었습니다" : "존재하지 않는 공유 링크입니다"}
        </div>
        <div>
          {status === 403
            ? "공유 링크의 유효 기간이 지났습니다."
            : "링크가 잘못되었거나 삭제된 링크입니다."}
        </div>
      </div>
    );
  }

  return (
    <div className={css.root}>
      <div className={css.topbar}>
        <span className={css.diagramName}>{data?.name}</span>
        <span className={css.readOnlyBadge}>읽기 전용</span>
      </div>
      <div className={css.content}>
        <EditorCanvas />
      </div>
    </div>
  );
};
