import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import type { DiagramResponse } from "../../../shared/api/diagrams.api";
import { Button, Skeleton } from "../../../design-system";
import {
  mainArea, mainHeader, mainTitle, filterRow, filterChip, filterChipVariants,
  grid, diagramCard, cardPreview, miniTable, miniTableHeader, miniField,
  cardBody, cardName, cardMeta, dialectBadge, newCard, newCardIcon,
} from "./DiagramGrid.css";

interface DiagramGridProps {
  diagrams: DiagramResponse[];
  projectName?: string;
  onCreateDiagram: () => void;
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

export const DiagramGrid = ({ diagrams, projectName, onCreateDiagram, loading = false }: DiagramGridProps) => (
  <div className={mainArea}>
    <div className={mainHeader}>
      <div className={mainTitle}>{projectName ?? "프로젝트를 선택하세요"}</div>
      {projectName && (
        <Button variant="primary" size="md" onClick={onCreateDiagram}>
          + 새 ERD
        </Button>
      )}
    </div>
    {projectName && (
      <div className={filterRow}>
        <button className={[filterChip, filterChipVariants.active].join(" ")}>전체</button>
        <button className={[filterChip, filterChipVariants.inactive].join(" ")}>최근 수정</button>
        <button className={[filterChip, filterChipVariants.inactive].join(" ")}>내가 만든</button>
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
        {diagrams.map((diagram) => (
          <Link key={diagram.id} to={`/diagrams/${diagram.id}`} className={diagramCard}>
            <DiagramCardPreview diagram={diagram} />
            <div className={cardBody}>
              <div className={cardName}>{diagram.name}</div>
              <div className={cardMeta}>
                <span className={dialectBadge}>{diagram.content.dialect}</span>
                {formatDistanceToNow(new Date(diagram.updatedAt), { addSuffix: true, locale: ko })}
              </div>
            </div>
          </Link>
        ))}
        <button className={newCard} onClick={onCreateDiagram}>
          <div className={newCardIcon}>+</div>
          새 ERD 만들기
        </button>
      </div>
    )}
  </div>
);
