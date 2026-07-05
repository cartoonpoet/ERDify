import type { FocusEvent } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { MoreVertical, Pencil, Share2, FolderInput, Copy, Trash2 } from "lucide-react";
import type { DiagramListItem } from "@/shared/api/diagrams.api";
import { Button, Skeleton } from "@/components";
import {
  mainArea, mainHeader, mainTitle, filterRow, filterChip, filterChipVariants,
  grid, diagramCardWrapper, diagramCard, cardPreview,
  miniTable, miniTableHeader, miniField, cardBody, cardName, cardMeta,
  dialectBadge, newCard, newCardIcon,
  ctxBtn, ctxMenu, ctxItem, ctxItemDanger, ctxDivider,
  filterRowDisabled, sectionError, sectionErrorIcon, sectionErrorTitle, sectionErrorDesc, sectionErrorBtn, sectionErrorGuide,
  activeUsersRow, avatarStack, avatar, avatarOverflow, activeUsersBadge, activeDot, activeUsersCount,
} from "./DiagramGrid.css";
import type { ActiveUser } from "@erdify/contracts";
import { ERROR_CONTENT } from "@/shared/utils/queryErrorContent";
import { ShareDiagramModal } from "@/shared/components/ShareDiagramModal";
import { EditDiagramModal } from "@/features/dashboard/components/EditDiagramModal";
import { MoveOrCopyDiagramModal } from "./MoveOrCopyDiagramModal";
import { useDiagramGrid } from "../hooks/useDiagramGrid";

const DiagramCardPreview = ({ diagram }: { diagram: DiagramListItem }) => {
  const entities = Array.isArray(diagram.previewEntities) ? diagram.previewEntities : [];
  if (entities.length === 0) {
    return <div className={cardPreview} />;
  }
  return (
    <div className={cardPreview}>
      {entities.map((entity) => (
        <div key={entity.id} className={miniTable}>
          <div className={miniTableHeader}>{entity.name}</div>
          {(entity.columns ?? []).map((col) => (
            <div key={col.id} className={miniField}>{col.name}</div>
          ))}
        </div>
      ))}
    </div>
  );
};

const ActiveUsersIndicator = ({ users }: { users: ActiveUser[] }) => {
  if (users.length === 0) return null;
  const displayed = users.slice(0, 3);
  const overflow = users.length - displayed.length;
  return (
    <div className={activeUsersRow}>
      <div className={avatarStack}>
        {displayed.map((u) => (
          <div key={u.userId} className={avatar} style={{ background: u.color }} title={u.email}>
            {u.email.charAt(0).toUpperCase()}
          </div>
        ))}
        {overflow > 0 && <div className={avatarOverflow}>+{overflow}</div>}
      </div>
      <div className={activeUsersBadge}>
        <div className={activeDot} />
        <span className={activeUsersCount}>{users.length}명</span>
      </div>
    </div>
  );
};

export const DiagramGrid = () => {
  const {
    projectId,
    projectName,
    isLoading,
    isError,
    error,
    refetch,
    activeUsers,
    activeFilter, setActiveFilter,
    menuOpenId,
    shareDiagramItem, setShareDiagramItem,
    editDiagramItem, setEditDiagramItem,
    moveOrCopyItem, setMoveOrCopyItem,
    filtered,
    errorStatus,
    isPermissionError,
    onCreateDiagram,
    onImportDiagram,
    handleMenuClose,
    handleEditDiagram,
    handleShareDiagram,
    handleMoveDiagram,
    handleCopyDiagram,
    handleDeleteDiagram,
    handleMenuToggle,
  } = useDiagramGrid();

  return (
    <div className={mainArea}>
      <div className={mainHeader}>
        <div className={mainTitle}>{projectName ?? "프로젝트를 선택하세요"}</div>
        {projectName && (
          <Button variant="secondary" size="md" onClick={onImportDiagram} disabled={isPermissionError}>
            가져오기
          </Button>
        )}
        {projectName && (
          <Button variant="primary" size="md" onClick={onCreateDiagram} disabled={isPermissionError}>
            + 새 ERD
          </Button>
        )}
      </div>
      {projectName && (
        <div className={[filterRow, isError ? filterRowDisabled : ""].filter(Boolean).join(" ")}>
          <button
            className={[filterChip, activeFilter === "all" ? filterChipVariants.active : filterChipVariants.inactive].join(" ")}
            aria-pressed={activeFilter === "all"}
            onClick={() => setActiveFilter("all")}
          >
            전체
          </button>
          <button
            className={[filterChip, activeFilter === "recent" ? filterChipVariants.active : filterChipVariants.inactive].join(" ")}
            aria-pressed={activeFilter === "recent"}
            onClick={() => setActiveFilter("recent")}
          >
            최근 수정
          </button>
          <button
            className={[filterChip, activeFilter === "mine" ? filterChipVariants.active : filterChipVariants.inactive].join(" ")}
            aria-pressed={activeFilter === "mine"}
            onClick={() => setActiveFilter("mine")}
          >
            내가 만든
          </button>
        </div>
      )}
      {isError ? (
        <div className={sectionError}>
          <div className={sectionErrorIcon}>{ERROR_CONTENT[errorStatus!].icon}</div>
          <div className={sectionErrorTitle}>{ERROR_CONTENT[errorStatus!].title}</div>
          <div className={sectionErrorDesc}>{ERROR_CONTENT[errorStatus!].desc}</div>
          {ERROR_CONTENT[errorStatus!].retryable && (
            <button type="button" className={sectionErrorBtn} onClick={() => refetch()}>
              다시 시도
            </button>
          )}
          <div className={sectionErrorGuide}>{ERROR_CONTENT[errorStatus!].guide}</div>
        </div>
      ) : isLoading && !!projectId ? (
        <div className={grid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={140} />
          ))}
        </div>
      ) : (
        <div className={grid}>
          {filtered.map((diagram) => (
            <div
              key={diagram.id}
              className={diagramCardWrapper}
              tabIndex={0}
              onBlur={(e: FocusEvent<HTMLDivElement>) => {
                if (!e.currentTarget.contains(e.relatedTarget)) handleMenuClose();
              }}
            >
              <Link to={`/diagrams/${diagram.id}`} className={diagramCard} aria-label={`${diagram.name} 다이어그램 열기`}>
                <DiagramCardPreview diagram={diagram} />
                <div className={cardBody}>
                  <div className={cardName}>{diagram.name}</div>
                  <div className={cardMeta}>
                    <span className={dialectBadge}>{diagram.dialect}</span>
                    {(activeUsers[diagram.id]?.length ?? 0) === 0 && formatDistanceToNow(new Date(diagram.updatedAt), { addSuffix: true, locale: ko })}
                    <ActiveUsersIndicator users={activeUsers[diagram.id] ?? []} />
                  </div>
                </div>
              </Link>
              <button
                className={ctxBtn}
                aria-label="더보기"
                aria-expanded={menuOpenId === diagram.id}
                aria-haspopup="menu"
                onClick={handleMenuToggle(diagram.id)}
              >
                <MoreVertical size={13} aria-hidden="true" />
              </button>
              {menuOpenId === diagram.id && (
                <div className={ctxMenu}>
                  <button className={ctxItem} onClick={handleEditDiagram(diagram)}>
                    <Pencil size={13} aria-hidden="true" /> 수정
                  </button>
                  <button className={ctxItem} onClick={handleShareDiagram(diagram)}>
                    <Share2 size={13} aria-hidden="true" /> 공유하기
                  </button>
                  <button className={ctxItem} onClick={handleMoveDiagram(diagram)}>
                    <FolderInput size={13} aria-hidden="true" /> 다른 프로젝트로 이동
                  </button>
                  <button className={ctxItem} onClick={handleCopyDiagram(diagram)}>
                    <Copy size={13} aria-hidden="true" /> 다른 프로젝트로 복사
                  </button>
                  <div className={ctxDivider} />
                  <button className={ctxItemDanger} onClick={handleDeleteDiagram(diagram)}>
                    <Trash2 size={13} aria-hidden="true" /> 삭제
                  </button>
                </div>
              )}
            </div>
          ))}
          {projectName && (
            <button className={newCard} onClick={onCreateDiagram}>
              <div className={newCardIcon}>+</div>
              새 ERD 만들기
            </button>
          )}
        </div>
      )}
      {shareDiagramItem && (
        <ShareDiagramModal
          open={!!shareDiagramItem}
          diagramId={shareDiagramItem.id}
          initialShareToken={shareDiagramItem.shareToken}
          initialExpiresAt={shareDiagramItem.shareExpiresAt}
          onClose={() => setShareDiagramItem(null)}
        />
      )}
      {editDiagramItem && (
        <EditDiagramModal
          open={!!editDiagramItem}
          diagram={editDiagramItem}
          onClose={() => setEditDiagramItem(null)}
        />
      )}
      {moveOrCopyItem && (
        <MoveOrCopyDiagramModal
          open
          mode={moveOrCopyItem.mode}
          diagram={moveOrCopyItem.diagram}
          onClose={() => setMoveOrCopyItem(null)}
        />
      )}
    </div>
  );
};
