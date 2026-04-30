import { useVersionHistory } from "../hooks/useVersionHistory";
import { useEditorStore } from "../stores/useEditorStore";

interface VersionHistoryDrawerProps {
  diagramId: string;
  onClose: () => void;
}

export function VersionHistoryDrawer({ diagramId, onClose }: VersionHistoryDrawerProps) {
  const { versions, isLoadingVersions, restoreVersion, isRestoring } =
    useVersionHistory(diagramId);
  const isDirty = useEditorStore((s) => s.isDirty);

  return (
    <div
      style={{
        position: "absolute",
        right: 0,
        top: 0,
        bottom: 0,
        width: 320,
        background: "#fff",
        borderLeft: "1px solid #e5e7eb",
        display: "flex",
        flexDirection: "column",
        zIndex: 10,
        boxShadow: "-4px 0 12px rgba(0,0,0,0.06)"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          borderBottom: "1px solid #e5e7eb"
        }}
      >
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>버전 기록</h3>
        <button
          onClick={onClose}
          aria-label="닫기"
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#6b7280" }}
        >
          ✕
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {isLoadingVersions ? (
          <p style={{ color: "#9ca3af", fontSize: 13, margin: 0 }}>불러오는 중...</p>
        ) : versions.length === 0 ? (
          <p style={{ color: "#9ca3af", fontSize: 13, margin: 0 }}>저장된 버전이 없습니다.</p>
        ) : (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 8
            }}
          >
            {versions.map((v) => (
              <li
                key={v.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  background: "#f9fafb",
                  borderRadius: 6,
                  border: "1px solid #e5e7eb"
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>v{v.revision}</div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                    {new Date(v.createdAt).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (isDirty && !window.confirm("저장되지 않은 변경사항이 있습니다. 복원하면 변경사항이 사라집니다. 계속하시겠습니까?")) {
                      return;
                    }
                    restoreVersion(v.id);
                  }}
                  disabled={isRestoring}
                  style={{
                    padding: "4px 10px",
                    fontSize: 12,
                    background: isRestoring ? "#9ca3af" : "#374151",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    cursor: isRestoring ? "not-allowed" : "pointer"
                  }}
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
}
