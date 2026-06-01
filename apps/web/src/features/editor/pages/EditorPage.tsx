import { randomUUID } from "@/shared/utils/uuid";
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { addEntity } from "@erdify/domain";
import { Share2 } from "lucide-react";
import { ReactFlowProvider } from "@xyflow/react";
import { getDiagram } from "@/shared/api/diagrams.api";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import { EditorCanvas } from "../components/EditorCanvas";
import { RelationshipPopover } from "../components/RelationshipPopover";
import { RightSidebar } from "../components/RightSidebar";
import { InviteModal } from "../components/InviteModal";
import { PresenceIndicator } from "../components/PresenceIndicator";
import { ExportModal } from "../components/ExportModal";
import { ShareDiagramModal } from "@/shared/components/ShareDiagramModal";
import { FkSetupModal } from "../components/FkSetupModal";
import { RelDeleteConfirmModal } from "../components/RelDeleteConfirmModal";
import { SchemaFilterSidebar } from "../components/SchemaFilterSidebar";
import { ImportIntoEditorModal } from "../components/ImportIntoEditorModal";
import { useDiagramAutosave } from "@/features/editor/hooks/useDiagramAutosave";
import { useVersionHistory } from "@/features/editor/hooks/useVersionHistory";
import { useRealtimeCollaboration } from "@/features/editor/hooks/useRealtimeCollaboration";
import { EditorPageSkeleton } from "./EditorPageSkeleton";
import * as css from "./editor-page.css";

export const EditorPage = () => {
  const { diagramId } = useParams<{ diagramId: string }>();
  const navigate = useNavigate();
  const [showInvite, setShowInvite] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);

  const { isDirty, isCollaborating, setDocument, setCanEdit, applyCommand, selectedRelationshipId, popoverPos, openSearchTab, undo, canEdit } = useEditorStore();

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
        openSearchTab();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && canEditRef.current && !isEditingText) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSearchTab, undo]);

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

        {/* ① 테이블 추가 */}
        <button
          onClick={handleAddTable}
          className={css.topbarBtn({ variant: "ghost" })}
          title="테이블 추가 (⌘T)"
        >
          + 테이블
        </button>

        <div className={css.topbarDivider} />

        {/* ② 파일 드롭다운 (hover) */}
        <div
          className={css.fileDropdownWrap}
          onMouseEnter={() => setShowFileMenu(true)}
          onMouseLeave={() => setShowFileMenu(false)}
        >
          <button className={css.topbarBtn({ variant: "ghost" })}>
            파일 <span className={css.fileDropdownChevron}>▾</span>
          </button>
          {showFileMenu && (
            <div className={css.fileDropdownMenu}>
              <button
                className={css.fileDropdownItem}
                onClick={() => { setShowFileMenu(false); setShowImport(true); }}
              >
                <span className={css.fileDropdownItemIcon}>↓</span>
                가져오기
                <span className={css.fileDropdownKbd}>⌘I</span>
              </button>
              <div className={css.fileDropdownSep} />
              <button
                className={css.fileDropdownItem}
                onClick={() => { setShowFileMenu(false); setShowExport(true); }}
              >
                <span className={css.fileDropdownItemIcon}>↑</span>
                내보내기
                <span className={css.fileDropdownKbd}>⌘E</span>
              </button>
              <div className={css.fileDropdownSep} />
              <button
                className={css.fileDropdownItem}
                onClick={() => { setShowFileMenu(false); setShowExport(true); }}
              >
                <span className={css.fileDropdownItemIcon}>⎘</span>
                복사본 저장
              </button>
            </div>
          )}
        </div>

        {/* ③ 버전 저장 */}
        <button
          onClick={() => saveVersion()}
          disabled={isSavingVersion}
          className={css.topbarBtn({ variant: "success" })}
        >
          ↑ 버전 저장
        </button>

        <div className={css.topbarDivider} />

        {/* ④ 멤버 현황 + 초대 */}
        <div className={css.presenceGroup}>
          <PresenceIndicator />
          <button
            onClick={() => setShowInvite(true)}
            className={css.inviteBtn}
            title="멤버 초대"
            aria-label="멤버 초대"
          >
            +
          </button>
        </div>

        {/* ⑤ 공유 (primary blue) */}
        <button
          onClick={() => setShowShare(true)}
          className={css.topbarBtn({ variant: "primary" })}
        >
          <Share2 size={13} aria-hidden="true" /> 공유
        </button>
      </div>

      <ReactFlowProvider>
        <div className={css.content}>
          <SchemaFilterSidebar />
          <div className={css.canvasArea}>
            <EditorCanvas hideMinimap={false} />
            {selectedRelationshipId && popoverPos ? (
              <RelationshipPopover
                relationshipId={selectedRelationshipId}
                pos={popoverPos}
              />
            ) : null}
          </div>
          {diagramId && <RightSidebar diagramId={diagramId} />}
        </div>
      </ReactFlowProvider>

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
