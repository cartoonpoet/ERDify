import type { DiffChange } from "@erdify/contracts";
import * as css from "./DiffCard.css";

interface DiffCardProps {
  messageId: string;
  diff: DiffChange[];
  accepted: boolean | null;
  onOpenReview: (messageId: string) => void;
}

export const DiffCard = ({ messageId, diff, accepted, onOpenReview }: DiffCardProps) => {
  if (accepted === true) {
    return <div className={css.statusAccepted}>✓ 변경사항 적용됨</div>;
  }

  if (accepted === false) {
    return <div className={css.statusRejected}>✗ 변경사항 거절됨</div>;
  }

  return (
    <div className={css.card}>
      <span className={css.summary}>{diff.length}개 변경사항 제안됨</span>
      <button type="button" className={css.reviewBtn} onClick={() => onOpenReview(messageId)}>
        검토하기 →
      </button>
    </div>
  );
};
