import { Share2 } from "lucide-react";
import { ReactFlowProvider } from "@xyflow/react";
import type { DiagramDialect } from "@erdify/domain";
import { SaveCopyModal } from "../components/SaveCopyModal";
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
import { EditorPageSkeleton } from "./EditorPageSkeleton";
import { useEditorPage } from "../hooks/useEditorPage";
import { useEditorModals } from "../hooks/useEditorModals";
import * as css from "./editor-page.css";

export const EditorPage = () => {
  const {
    diagramId, data, isLoading,
    isDirty, isCollaborating,
    selectedRelationshipId, popoverPos,
    isDuplicating,
    saveVersion, isSavingVersion,
    handleBack,
    handleAddTable, handleSaveCopy,
  } = useEditorPage();

  const {
    showInvite, setShowInvite,
    showExport, setShowExport,
    showShare, setShowShare,
    showImport, setShowImport,
    showFileMenu,
    showSaveCopy, setShowSaveCopy,
    handleFileMenuOpen, handleFileMenuClose,
    handleImportOpen, handleExportOpen, handleSaveCopyOpen,
  } = useEditorModals(diagramId);

  if (isLoading) {
    return <EditorPageSkeleton />;
  }

  return (
    <div className={css.root}>
      <div className={css.topbar}>
        <button
          onClick={handleBack}
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
          onClick={handleAddTable}
          className={css.topbarBtn({ variant: "ghost" })}
          title="테이블 추가 (⌘T)"
        >
          + 테이블
        </button>

        <div className={css.topbarDivider} />

        <div
          className={css.fileDropdownWrap}
          onMouseEnter={handleFileMenuOpen}
          onMouseLeave={handleFileMenuClose}
        >
          <button className={css.topbarBtn({ variant: "ghost" })}>
            파일 <span className={css.fileDropdownChevron}>▾</span>
          </button>
          {showFileMenu && (
            <div className={css.fileDropdownMenu}>
              <button
                className={css.fileDropdownItem}
                onClick={handleImportOpen}
              >
                <span className={css.fileDropdownItemIcon}>↓</span>
                가져오기
                <span className={css.fileDropdownKbd}>⌘I</span>
              </button>
              <div className={css.fileDropdownSep} />
              <button
                className={css.fileDropdownItem}
                onClick={handleExportOpen}
              >
                <span className={css.fileDropdownItemIcon}>↑</span>
                내보내기
                <span className={css.fileDropdownKbd}>⌘E</span>
              </button>
              <div className={css.fileDropdownSep} />
              <button
                className={css.fileDropdownItem}
                disabled={isDuplicating}
                onClick={handleSaveCopyOpen}
              >
                <span className={css.fileDropdownItemIcon}>⎘</span>
                {isDuplicating ? "복사 중…" : "복사본 저장"}
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => saveVersion()}
          disabled={isSavingVersion}
          className={css.topbarBtn({ variant: "success" })}
        >
          ↑ 버전 저장
        </button>

        <div className={css.topbarDivider} />

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

      {showSaveCopy && data && diagramId ? (
        <SaveCopyModal
          open={showSaveCopy}
          onClose={() => setShowSaveCopy(false)}
          defaultName={`${data.name} (복사본)`}
          defaultDialect={(data.content.dialect ?? "postgresql") as DiagramDialect}
          onSave={handleSaveCopy}
        />
      ) : null}
    </div>
  );
};
