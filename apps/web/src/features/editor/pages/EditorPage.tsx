import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { addEntity } from "@erdify/domain";
import { Share2 } from "lucide-react";
import { getDiagram } from "../../../shared/api/diagrams.api";
import { useEditorStore } from "../stores/useEditorStore";
import { EditorCanvas } from "../components/EditorCanvas";
import { RelationshipPopover } from "../components/RelationshipPopover";
import { VersionHistoryDrawer } from "../components/VersionHistoryDrawer";
import { InviteModal } from "../components/InviteModal";
import { PresenceIndicator } from "../components/PresenceIndicator";
import { ExportDdlModal } from "../components/ExportDdlModal";
import { ExportOrmModal } from "../components/ExportOrmModal";
import { ShareDiagramModal } from "../components/ShareDiagramModal";
import { FkSetupModal } from "../components/FkSetupModal";
import { RelDeleteConfirmModal } from "../components/RelDeleteConfirmModal";
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
  const [showShare, setShowShare] = useState(false);
  const [showOrmExport, setShowOrmExport] = useState(false);

  const { isDirty, setDocument, setCanEdit, applyCommand, selectedRelationshipId, popoverPos, setSearchOpen } = useEditorStore();

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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setSearchOpen]);

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
          aria-label="뒤로가기"
        >
          ←
        </button>
        <span className={css.diagramName}>{data?.name}</span>
        <span className={css.statusText}>{isDirty ? "수정됨" : "저장됨"}</span>
        <div className={css.spacer} />
        <button
          onClick={() => setSearchOpen(true)}
          className={css.topbarBtn({ variant: "secondary" })}
          title="테이블 검색 (Ctrl+F)"
          aria-label="테이블 검색"
        >
          🔍 검색
        </button>
        <PresenceIndicator />
        <button
          onClick={() => setShowShare(true)}
          className={css.topbarBtn({ variant: "secondary" })}
          style={{ display: "flex", alignItems: "center", gap: "4px" }}
        >
          <Share2 size={13} aria-hidden="true" /> 공유
        </button>
        <button
          onClick={() => setShowExport(true)}
          className={css.topbarBtn({ variant: "secondary" })}
        >
          DDL 내보내기
        </button>
        <button
          onClick={() => setShowOrmExport(true)}
          className={css.topbarBtn({ variant: "secondary" })}
        >
          ORM 내보내기
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

      <ShareDiagramModal
        open={showShare}
        diagramId={diagramId!}
        initialShareToken={data?.shareToken ?? null}
        initialExpiresAt={data?.shareExpiresAt ?? null}
        onClose={() => setShowShare(false)}
      />
      <ExportOrmModal open={showOrmExport} onClose={() => setShowOrmExport(false)} />
      <FkSetupModal />
      <RelDeleteConfirmModal />
    </div>
  );
};
