import { useVersionHistory } from "../hooks/useVersionHistory";
import { useEditorStore } from "../stores/useEditorStore";
import * as css from "./version-history-drawer.css";

interface VersionHistoryDrawerProps {
  diagramId: string;
  onClose: () => void;
}

export const VersionHistoryDrawer = ({ diagramId, onClose }: VersionHistoryDrawerProps) => {
  const { versions, isLoadingVersions, restoreVersion, isRestoring } =
    useVersionHistory(diagramId);
  const isDirty = useEditorStore((s) => s.isDirty);

  return (
    <div className={css.drawer}>
      <div className={css.drawerHeader}>
        <h3 className={css.drawerTitle}>버전 기록</h3>
        <button onClick={onClose} aria-label="닫기" className={css.closeBtn}>
          ✕
        </button>
      </div>

      <div className={css.drawerBody}>
        {isLoadingVersions ? (
          <p className={css.emptyText}>불러오는 중...</p>
        ) : versions.length === 0 ? (
          <p className={css.emptyText}>저장된 버전이 없습니다.</p>
        ) : (
          <ul className={css.versionList}>
            {versions.map((v) => (
              <li key={v.id} className={css.versionItem}>
                <div>
                  <div className={css.versionLabel}>v{v.revision}</div>
                  <div className={css.versionDate}>
                    {new Date(v.createdAt).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (
                      isDirty &&
                      !window.confirm(
                        "저장되지 않은 변경사항이 있습니다. 복원하면 변경사항이 사라집니다. 계속하시겠습니까?"
                      )
                    ) {
                      return;
                    }
                    restoreVersion(v.id);
                  }}
                  disabled={isRestoring}
                  className={css.restoreBtn}
                >
                  복원
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
