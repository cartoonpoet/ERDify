import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { addEntity } from "@erdify/domain";
import { getDiagram } from "../../../shared/api/diagrams.api";
import { useEditorStore } from "../stores/useEditorStore";
import { EditorCanvas } from "../components/EditorCanvas";
import { RelationshipPopover } from "../components/RelationshipPopover";
import { VersionHistoryDrawer } from "../components/VersionHistoryDrawer";
import { InviteModal } from "../components/InviteModal";
import { PresenceIndicator } from "../components/PresenceIndicator";
import { ExportDdlModal } from "../components/ExportDdlModal";
import { useDiagramAutosave } from "../hooks/useDiagramAutosave";
import { useVersionHistory } from "../hooks/useVersionHistory";
import { useRealtimeCollaboration } from "../hooks/useRealtimeCollaboration";
import { EditorPageSkeleton } from "./EditorPageSkeleton";
import * as css from "./editor-page.css";

export const EditorPage = () => {
  const { diagramId } = useParams<{ diagramId: string }>();
  const navigate = useNavigate();
  const [showHistory, setShowHistory] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const { isDirty, setDocument, setCanEdit, applyCommand, selectedRelationshipId, popoverPos } = useEditorStore();

  const { data, isLoading } = useQuery({
    queryKey: ["diagram", diagramId],
    queryFn: () => getDiagram(diagramId!),
    enabled: !!diagramId
  });

  useEffect(() => {
    if (data) {
      setDocument(data.content);
      setCanEdit(data.myRole !== "viewer");
    }
  // data.id가 바뀔 때(다른 다이어그램으로 이동)만 재초기화, 백그라운드 refetch는 무시
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);

  useRealtimeCollaboration(diagramId ?? "");
  useDiagramAutosave(diagramId ?? "");
  const { saveVersion, isSavingVersion } = useVersionHistory(diagramId ?? "");

  const handleAddTable = () => {
    applyCommand((doc) =>
      addEntity(doc, {
        id: crypto.randomUUID(),
        name: `Table_${doc.entities.length + 1}`
      })
    );
  };

  if (isLoading) {
    return <EditorPageSkeleton />;
  }

  return (
    <div className={css.root}>
      <div className={css.topbar}>
        <button
          onClick={() => navigate(-1)}
          className={css.backBtn}
          title="뒤로가기"
        >
          ←
        </button>
        <span className={css.diagramName}>{data?.name}</span>
        <span className={css.statusText}>{isDirty ? "수정됨" : "저장됨"}</span>
        <div className={css.spacer} />
        <PresenceIndicator />
        <button
          onClick={() => setShowExport(true)}
          className={css.topbarBtn({ variant: "secondary" })}
        >
          DDL 내보내기
        </button>
        <button
          onClick={() => setShowInvite(true)}
          className={css.topbarBtn({ variant: "secondary" })}
        >
          + 멤버 초대
        </button>
        <button
          onClick={handleAddTable}
          className={css.topbarBtn({ variant: "dark" })}
        >
          + 테이블
        </button>
        <button
          onClick={() => saveVersion()}
          disabled={isSavingVersion}
          className={css.topbarBtn({ variant: "success" })}
        >
          버전 저장
        </button>
        <button
          onClick={() => setShowHistory((v) => !v)}
          className={css.topbarBtn({ variant: showHistory ? "historyActive" : "historyInactive" })}
        >
          기록
        </button>
      </div>

      <div className={css.content}>
        <div className={css.canvasArea}>
          <EditorCanvas />
          {selectedRelationshipId && popoverPos && (
            <RelationshipPopover
              relationshipId={selectedRelationshipId}
              pos={popoverPos}
            />
          )}
        </div>
        {showHistory && diagramId && (
          <VersionHistoryDrawer diagramId={diagramId} onClose={() => setShowHistory(false)} />
        )}
      </div>

      {showInvite && data?.organizationId && (
        <InviteModal
          open={showInvite}
          onClose={() => setShowInvite(false)}
          organizationId={data.organizationId}
        />
      )}

      <ExportDdlModal
        open={showExport}
        diagramName={data?.name ?? "diagram"}
        onClose={() => setShowExport(false)}
      />
    </div>
  );
};
