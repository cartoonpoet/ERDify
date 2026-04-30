import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getDiagram, updateDiagram } from "../../shared/api/diagrams.api";
import { addEntity } from "@erdify/domain";
import { useEditorStore } from "./stores/useEditorStore";
import { EditorCanvas } from "./components/EditorCanvas";

export function EditorPage() {
  const { diagramId } = useParams<{ diagramId: string }>();
  const { document, isDirty, setDocument, applyCommand, clearDirty } = useEditorStore();

  const { data, isLoading } = useQuery({
    queryKey: ["diagram", diagramId],
    queryFn: () => getDiagram(diagramId!),
    enabled: !!diagramId
  });

  useEffect(() => {
    if (data) setDocument(data.content);
  }, [data, setDocument]);

  const saveMutation = useMutation({
    mutationFn: () => updateDiagram(diagramId!, { content: document! }),
    onSuccess: () => clearDirty()
  });

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
          + Table
        </button>
        {isDirty && (
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            style={{
              padding: "4px 12px",
              background: saveMutation.isPending ? "#9ca3af" : "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: saveMutation.isPending ? "not-allowed" : "pointer",
              fontSize: 13
            }}
          >
            {saveMutation.isPending ? "Saving…" : "Save"}
          </button>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <EditorCanvas />
      </div>
    </div>
  );
}
