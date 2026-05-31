import { randomUUID } from "@/shared/utils/uuid";
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { addEntity } from "@erdify/domain";
import { Share2 } from "lucide-react";
import { getDiagram } from "@/shared/api/diagrams.api";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import { EditorCanvas } from "../components/EditorCanvas";
import { RelationshipPopover } from "../components/RelationshipPopover";
import { ActivityDrawer } from "../components/ActivityDrawer";
import { InviteModal } from "../components/InviteModal";
import { PresenceIndicator } from "../components/PresenceIndicator";
import { ExportModal } from "../components/ExportModal";
import { ShareDiagramModal } from "@/shared/components/ShareDiagramModal";
import { FkSetupModal } from "../components/FkSetupModal";
import { RelDeleteConfirmModal } from "../components/RelDeleteConfirmModal";
import { SchemaFilterSidebar } from "../components/SchemaFilterSidebar";
import { ImportIntoEditorModal } from "../components/ImportIntoEditorModal";
import { FloatingAIChat } from "@/features/ai/components/FloatingAIChat";
import { useAIChatStore } from "@/features/ai/store/useAIChatStore";
import { useDiagramAutosave } from "@/features/editor/hooks/useDiagramAutosave";
import { useVersionHistory } from "@/features/editor/hooks/useVersionHistory";
import { useRealtimeCollaboration } from "@/features/editor/hooks/useRealtimeCollaboration";
import { EditorPageSkeleton } from "./EditorPageSkeleton";
import * as css from "./editor-page.css";

export const EditorPage = () => {
  const { diagramId } = useParams<{ diagramId: string }>();
  const navigate = useNavigate();
  const [showActivity, setShowActivity] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const { isDirty, isCollaborating, setDocument, setCanEdit, applyCommand, selectedRelationshipId, popoverPos, setSearchOpen, undo, canEdit } = useEditorStore();
  const isAIChatOpen = useAIChatStore((s) => s.isOpen);

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

  const canEditRef = useRef(canEdit);
  canEditRef.current = canEdit;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isEditingText = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && canEditRef.current && !isEditingText) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setSearchOpen, undo]);

  useRealtimeCollaboration(diagramId ?? "");
  useDiagramAutosave(diagramId ?? "");
  const { saveVersion, isSavingVersion } = useVersionHistory(diagramId ?? "");

  const handleAddTable = () => {
    applyCommand((doc) =>
      addEntity(doc, {
        id: randomUUID(),
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
        <div className={css.breadcrumb}>
          <span className={css.breadcrumbSegment}>{data?.organizationName}</span>
          <span className={css.breadcrumbSep}>›</span>
          <span className={css.breadcrumbSegment}>{data?.projectName}</span>
          <span className={css.breadcrumbSep}>›</span>
          <span className={css.breadcrumbCurrent}>{data?.name}</span>
        </div>
        <span className={css.statusText}>{isCollaborating ? "동기화됨" : isDirty ? "수정됨" : "저장됨"}</span>
        <div className={css.spacer} />
        <button
          onClick={() => setShowImport(true)}
          className={css.topbarBtn({ variant: "secondary" })}
          title="DDL 가져오기"
        >
          가져오기
        </button>
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
          내보내기
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
          onClick={() => setShowActivity((v) => !v)}
          className={css.topbarBtn({ variant: showActivity ? "historyActive" : "historyInactive" })}
          title="활동 기록"
        >
          활동 기록
        </button>
      </div>

      <div className={css.content}>
        <SchemaFilterSidebar />
        <div className={css.canvasArea}>
          <EditorCanvas hideMinimap={isAIChatOpen} />
          {diagramId && <FloatingAIChat diagramId={diagramId} />}
          {selectedRelationshipId && popoverPos ? (
            <RelationshipPopover
              relationshipId={selectedRelationshipId}
              pos={popoverPos}
            />
          ) : null}
        </div>
        {showActivity && diagramId ? (
          <ActivityDrawer diagramId={diagramId} onClose={() => setShowActivity(false)} />
        ) : null}
      </div>

      {showInvite && data?.organizationId ? (
        <InviteModal
          open={showInvite}
          onClose={() => setShowInvite(false)}
          organizationId={data.organizationId}
        />
      ) : null}

      <ExportModal
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
      <FkSetupModal />
      <RelDeleteConfirmModal />
      <ImportIntoEditorModal open={showImport} onClose={() => setShowImport(false)} />
    </div>
  );
};
