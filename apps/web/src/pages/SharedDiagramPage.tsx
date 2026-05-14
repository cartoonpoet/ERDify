import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPublicDiagram } from "@/shared/api/diagrams.api";
import { useEditorStore } from "@/store/useEditorStore";
import { EditorCanvas } from "@/components/EditorCanvas";
import { Skeleton } from "@/shared/components/Skeleton";
import * as css from "./shared-diagram-page.css";

export const SharedDiagramPage = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const { setDocument, setCanEdit } = useEditorStore();

  const { data, isLoading } = useQuery({
    queryKey: ["public-diagram", shareToken],
    queryFn: () => getPublicDiagram(shareToken!),
    enabled: !!shareToken,
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
