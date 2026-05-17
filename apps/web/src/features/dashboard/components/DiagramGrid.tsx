import { useState } from "react";
import type { FocusEvent } from "react";
import { Link, useParams, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { MoreVertical, Pencil, Share2, Trash2 } from "lucide-react";
import { listDiagrams } from "@/shared/api/diagrams.api";
import { listProjects } from "@/shared/api/projects.api";
import { getMe } from "@/shared/api/auth.api";
import type { DiagramListItem } from "@/shared/api/diagrams.api";
import type { DashboardOutletContext } from "../pages/DashboardPage";
import { Button, Skeleton } from "@/components";
import {
  mainArea, mainHeader, mainTitle, filterRow, filterChip, filterChipVariants,
  grid, diagramCardWrapper, diagramCard, cardPreview,
  miniTable, miniTableHeader, miniField, cardBody, cardName, cardMeta,
  dialectBadge, newCard, newCardIcon,
  ctxBtn, ctxMenu, ctxItem, ctxItemDanger, ctxDivider,
  filterRowDisabled, sectionError, sectionErrorIcon, sectionErrorTitle, sectionErrorDesc, sectionErrorBtn, sectionErrorGuide,
} from "./DiagramGrid.css";
import { getErrorStatus, ERROR_CONTENT } from "@/shared/utils/queryErrorContent";
import { ShareDiagramModal } from "@/shared/components/ShareDiagramModal";
import { EditDiagramModal } from "@/features/dashboard/components/EditDiagramModal";

type FilterType = "all" | "recent" | "mine";

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

function applyFilter(
  diagrams: DiagramListItem[],
  filter: FilterType,
  userId: string | null,
  filterQuery?: string,
): DiagramListItem[] {
  let result = diagrams;
  if (filter === "recent") {
    result = [...result].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } else if (filter === "mine") {
    result = result.filter((d) => d.createdBy !== null && d.createdBy === userId);
  }
  if (filterQuery) {
    const q = filterQuery.toLowerCase();
    result = result.filter((d) => d.name.toLowerCase().includes(q));
  }
  return result;
}

export const DiagramGrid = () => {
  const { orgId, projectId } = useParams<{ orgId: string; projectId?: string }>();
  const { onCreateDiagram, onImportDiagram, onDeleteDiagram, searchQuery } =
    useOutletContext<DashboardOutletContext>();

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const { data: projects = [] } = useQuery({
    queryKey: ["projects", orgId],
    queryFn: () => listProjects(orgId!),
    enabled: !!orgId,
  });
  const { data: diagrams = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["diagrams", projectId],
    queryFn: () => listDiagrams(projectId!),
    enabled: !!projectId,
    throwOnError: false,
  });

  const projectName = projects.find((p) => p.id === projectId)?.name;
  const currentUserId = me?.id ?? null;

  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [shareDiagramItem, setShareDiagramItem] = useState<DiagramListItem | null>(null);
  const [editDiagramItem, setEditDiagramItem] = useState<DiagramListItem | null>(null);

  const filtered = applyFilter(diagrams, activeFilter, currentUserId, searchQuery || undefined);
  const errorStatus = isError ? getErrorStatus(error) : null;
  const isPermissionError = errorStatus === 403;

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
                if (!e.currentTarget.contains(e.relatedTarget)) setMenuOpenId(null);
              }}
            >
              <Link to={`/diagrams/${diagram.id}`} className={diagramCard} aria-label={`${diagram.name} 다이어그램 열기`}>
                <DiagramCardPreview diagram={diagram} />
                <div className={cardBody}>
                  <div className={cardName}>{diagram.name}</div>
                  <div className={cardMeta}>
                    <span className={dialectBadge}>{diagram.dialect}</span>
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
                      setEditDiagramItem(diagram);
                      setMenuOpenId(null);
                    }}
                  >
                    <Pencil size={13} aria-hidden="true" /> 수정
                  </button>
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
    </div>
  );
};
