import { useState } from "react";
import type { FocusEvent } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { MoreVertical, Share2, Trash2 } from "lucide-react";
import type { DiagramResponse } from "../../../shared/api/diagrams.api";
import { Button, Skeleton } from "../../../design-system";
import {
  mainArea, mainHeader, mainTitle, filterRow, filterChip, filterChipVariants,
  grid, diagramCardWrapper, diagramCard, cardPreview,
  miniTable, miniTableHeader, miniField, cardBody, cardName, cardMeta,
  dialectBadge, newCard, newCardIcon,
  ctxBtn, ctxMenu, ctxItem, ctxItemDanger, ctxDivider,
} from "./DiagramGrid.css";
import { ShareDiagramModal } from "../../editor/components/ShareDiagramModal";

type FilterType = "all" | "recent" | "mine";

interface DiagramGridProps {
  diagrams: DiagramResponse[];
  projectName?: string;
  currentUserId: string | null;
  onCreateDiagram: () => void;
  onImportDiagram?: () => void;
  onDeleteDiagram: (diagramId: string) => void;
  loading?: boolean;
}

const DiagramCardPreview = ({ diagram }: { diagram: DiagramResponse }) => {
  const previewEntities = diagram.content.entities.slice(0, 2);
  if (previewEntities.length === 0) {
    return <div className={cardPreview} />;
  }
  return (
    <div className={cardPreview}>
      {previewEntities.map((entity) => (
        <div key={entity.id} className={miniTable}>
          <div className={miniTableHeader}>{entity.name}</div>
          {entity.columns.slice(0, 3).map((col) => (
            <div key={col.id} className={miniField}>{col.name}</div>
          ))}
        </div>
      ))}
    </div>
  );
};

function applyFilter(diagrams: DiagramResponse[], filter: FilterType, userId: string | null): DiagramResponse[] {
  if (filter === "recent") {
    return [...diagrams].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
  if (filter === "mine") {
    return diagrams.filter((d) => d.createdBy !== null && d.createdBy === userId);
  }
  return diagrams;
}

export const DiagramGrid = ({ diagrams, projectName, currentUserId, onCreateDiagram, onImportDiagram, onDeleteDiagram, loading = false }: DiagramGridProps) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [shareDiagramItem, setShareDiagramItem] = useState<DiagramResponse | null>(null);
  const filtered = applyFilter(diagrams, activeFilter, currentUserId);

  return (
    <div className={mainArea}>
      <div className={mainHeader}>
        <div className={mainTitle}>{projectName ?? "프로젝트를 선택하세요"}</div>
        {projectName && onImportDiagram && (
          <Button variant="secondary" size="md" onClick={onImportDiagram}>
            가져오기
          </Button>
        )}
        {projectName && (
          <Button variant="primary" size="md" onClick={onCreateDiagram}>
            + 새 ERD
          </Button>
        )}
      </div>
      {projectName && (
        <div className={filterRow}>
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
      {loading ? (
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
                if (!e.currentTarget.contains(e.relatedTarget)) setMenuOpenId(null);
              }}
            >
              <Link to={`/diagrams/${diagram.id}`} className={diagramCard} aria-label={`${diagram.name} 다이어그램 열기`}>
                <DiagramCardPreview diagram={diagram} />
                <div className={cardBody}>
                  <div className={cardName}>{diagram.name}</div>
                  <div className={cardMeta}>
                    <span className={dialectBadge}>{diagram.content.dialect}</span>
                    {formatDistanceToNow(new Date(diagram.updatedAt), { addSuffix: true, locale: ko })}
                  </div>
                </div>
              </Link>
              <button
                className={ctxBtn}
                aria-label="더보기"
                aria-expanded={menuOpenId === diagram.id}
                aria-haspopup="menu"
                onClick={(e) => {
                  e.preventDefault();
                  setMenuOpenId(menuOpenId === diagram.id ? null : diagram.id);
                }}
              >
                <MoreVertical size={13} aria-hidden="true" />
              </button>
              {menuOpenId === diagram.id && (
                <div className={ctxMenu}>
                  <button
                    className={ctxItem}
                    onClick={() => {
                      setShareDiagramItem(diagram);
                      setMenuOpenId(null);
                    }}
                  >
                    <Share2 size={13} aria-hidden="true" /> 공유하기
                  </button>
                  <div className={ctxDivider} />
                  <button
                    className={ctxItemDanger}
                    onClick={() => {
                      if (window.confirm(`"${diagram.name}" ERD를 삭제하시겠습니까?`)) {
                        onDeleteDiagram(diagram.id);
                      }
                      setMenuOpenId(null);
                    }}
                  >
                    <Trash2 size={13} aria-hidden="true" /> 삭제
                  </button>
                </div>
              )}
            </div>
          ))}
          <button className={newCard} onClick={onCreateDiagram}>
            <div className={newCardIcon}>+</div>
            새 ERD 만들기
          </button>
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
    </div>
  );
};
