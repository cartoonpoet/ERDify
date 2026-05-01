import { useNavigate } from "react-router-dom";
import { Skeleton } from "../../../design-system/Skeleton";
import * as css from "./editor-page.css";

export const EditorPageSkeleton = () => {
  const navigate = useNavigate();

  return (
    <div className={css.root}>
      <div className={css.topbar}>
        <button onClick={() => navigate(-1)} className={css.backBtn} title="뒤로가기">←</button>
        <Skeleton width={140} height={14} />
        <Skeleton width={44} height={12} />
        <div className={css.spacer} />
        <Skeleton width={80} height={28} />
        <Skeleton width={80} height={28} />
        <Skeleton width={72} height={28} />
        <Skeleton width={72} height={28} />
        <Skeleton width={44} height={28} />
      </div>
      <div className={css.content}>
        <Skeleton style={{ flex: 1, borderRadius: 0 }} />
      </div>
    </div>
  );
};
