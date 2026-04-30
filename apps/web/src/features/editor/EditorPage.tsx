import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { addEntity } from "@erdify/domain";
import { getDiagram } from "../../shared/api/diagrams.api";
import { useEditorStore } from "./stores/useEditorStore";
import { EditorCanvas } from "./components/EditorCanvas";
import { VersionHistoryDrawer } from "./components/VersionHistoryDrawer";
import { PresenceIndicator } from "./components/PresenceIndicator";
import { useDiagramAutosave } from "./hooks/useDiagramAutosave";
import { useVersionHistory } from "./hooks/useVersionHistory";
import { useRealtimeCollaboration } from "./hooks/useRealtimeCollaboration";

export function EditorPage() {
  const { diagramId } = useParams<{ diagramId: string }>();
  const [showHistory, setShowHistory] = useState(false);
  const { document, isDirty, setDocument, applyCommand } = useEditorStore();

  const { data, isLoading } = useQuery({
    queryKey: ["diagram", diagramId],
    queryFn: () => getDiagram(diagramId!),
    enabled: !!diagramId
  });

  const { collaborators, isConnected } = useRealtimeCollaboration(diagramId ?? "");

  useEffect(() => {
    if (data && !isConnected) setDocument(data.content);
  }, [data, setDocument, isConnected]);

  useDiagramAutosave(diagramId ?? "");

  const { saveVersion, isSavingVersion } = useVersionHistory(diagramId ?? "");

  function handleAddTable() {
    applyCommand((doc) =>
      addEntity(doc, {
        id: crypto.randomUUID(),
        name: `Table_${doc.entities.length + 1}`
      })
    );
  }

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        Loading...
      </div>
    );
  }

  const saveStatus = isDirty ? "수정됨" : "저장됨";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div
        style={{
          padding: "8px 16px",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          gap: 8,
          alignItems: "center",
          background: "#ffffff"
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 14 }}>{data?.name}</span>
        <span style={{ fontSize: 12, color: "#9ca3af" }}>{saveStatus}</span>
        <span
          style={{
            fontSize: 11,
            color: isConnected ? "#059669" : "#9ca3af",
            padding: "1px 6px",
            borderRadius: 10,
            background: isConnected ? "#d1fae5" : "#f3f4f6"
          }}
        >
          {isConnected ? "실시간" : "오프라인"}
        </span>
        <PresenceIndicator collaborators={collaborators} />
        <div style={{ flex: 1 }} />
        <button
          onClick={handleAddTable}
          style={{
            padding: "4px 12px",
            background: "#374151",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 13
          }}
        >
          + 테이블
        </button>
        <button
          onClick={() => saveVersion()}
          disabled={isSavingVersion}
          style={{
            padding: "4px 12px",
            background: isSavingVersion ? "#9ca3af" : "#059669",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: isSavingVersion ? "not-allowed" : "pointer",
            fontSize: 13
          }}
        >
          버전 저장
        </button>
        <button
          onClick={() => setShowHistory((v) => !v)}
          style={{
            padding: "4px 12px",
            background: showHistory ? "#2563eb" : "#f3f4f6",
            color: showHistory ? "#fff" : "#374151",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 13
          }}
        >
          기록
        </button>
      </div>
      <div style={{ flex: 1, position: "relative" }}>
        <EditorCanvas />
        {showHistory && diagramId && (
          <VersionHistoryDrawer diagramId={diagramId} onClose={() => setShowHistory(false)} />
        )}
      </div>
    </div>
  );
}
