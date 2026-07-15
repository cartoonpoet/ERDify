import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { randomUUID } from "@/shared/utils/uuid";
import { queryKeys } from "@/shared/lib/queryKeys";
import { addEntity } from "@erdify/domain";
import { getDiagram, duplicateDiagram } from "@/shared/api/diagrams.api";
import type { DiagramDialect } from "@erdify/domain";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import { useDiagramAutosave } from "./useDiagramAutosave";
import { useVersionHistory } from "./useVersionHistory";
import { useRealtimeCollaboration } from "./useRealtimeCollaboration";

export const useEditorPage = () => {
  const { diagramId } = useParams<{ diagramId: string }>();
  const navigate = useNavigate();

  const [isDuplicating, setIsDuplicating] = useState(false);

  const {
    isDirty, isCollaborating, setDocument, setCanEdit,
    applyCommand, selectedRelationshipId, popoverPos,
    openSearchTab, undo, canEdit,
  } = useEditorStore();
  const viewport = useEditorStore((s) => s.viewport);
  const setFlashingEntityId = useEditorStore((s) => s.setFlashingEntityId);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.diagram(diagramId!),
    queryFn: () => getDiagram(diagramId!),
    enabled: !!diagramId,
  });

  useEffect(() => {
    if (data) {
      setDocument(data.content);
      setCanEdit(data.myRole !== "viewer");
    }
  // data.id가 바뀔 때(다른 다이어그램으로 이동)만 재초기화, 백그라운드 refetch는 무시
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);

  const canEditRef = useRef(canEdit);
  canEditRef.current = canEdit;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isEditingText = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        openSearchTab();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && canEditRef.current && !isEditingText) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openSearchTab, undo]);

  useRealtimeCollaboration(diagramId ?? "");
  useDiagramAutosave(diagramId ?? "");
  const { saveVersion, isSavingVersion } = useVersionHistory(diagramId ?? "");

  const handleAddTable = () => {
    const canvas = document.querySelector(".react-flow");
    const rect = canvas?.getBoundingClientRect();
    const width = rect?.width ?? window.innerWidth;
    const height = rect?.height ?? window.innerHeight;
    const centerX = (width / 2 - viewport.x) / viewport.zoom;
    const centerY = (height / 2 - viewport.y) / viewport.zoom;
    const id = randomUUID();
    applyCommand((doc) =>
      addEntity(doc, {
        id,
        name: `Table_${doc.entities.length + 1}`,
        position: { x: centerX - 140, y: centerY - 60 },
      })
    );
    setFlashingEntityId(id);
  };

  const handleSaveCopy = async (name: string, dialect: DiagramDialect) => {
    if (!diagramId) return;
    setIsDuplicating(true);
    try {
      const copy = await duplicateDiagram(diagramId, { name, dialect });
      navigate(`/diagrams/${copy.id}`);
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleBack = () => navigate(-1);

  return {
    diagramId,
    data,
    isLoading,
    isDirty,
    isCollaborating,
    selectedRelationshipId,
    popoverPos,
    isDuplicating,
    saveVersion,
    isSavingVersion,
    handleBack,
    handleAddTable,
    handleSaveCopy,
  };
};
