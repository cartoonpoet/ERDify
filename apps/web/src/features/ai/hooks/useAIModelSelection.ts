import { useState, useRef, useEffect } from "react";
import { getAiChatConfig, getSessions } from "../api/ai.api";
import { useAIChatStore } from "../store/useAIChatStore";
import type { AiModelOption } from "../models";

const MODEL_STORAGE_KEY = "erdify.ai.model";

interface UseAIModelSelectionReturn {
  models: AiModelOption[];
  selectedModel: string;
  handleModelSelect: (value: string) => void;
}

export const useAIModelSelection = (diagramId: string): UseAIModelSelectionReturn => {
  const { setCurrentDiagramId, setSessions } = useAIChatStore();
  const [models, setModels] = useState<AiModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const prevDiagramIdRef = useRef<string | null>(null);

  // diagramId 변경 감지 — 세션 목록 + 사용 가능 모델을 불러온다
  useEffect(() => {
    if (prevDiagramIdRef.current === diagramId) return;
    prevDiagramIdRef.current = diagramId;

    setCurrentDiagramId(diagramId);
    getSessions(diagramId)
      .then((fetchedSessions) => setSessions(fetchedSessions))
      .catch(() => {});
    getAiChatConfig(diagramId)
      .then((config) => {
        setModels(config.models);
        const saved = localStorage.getItem(MODEL_STORAGE_KEY) ?? "";
        const valid = config.models.some((m) => m.value === saved);
        setSelectedModel(valid ? saved : (config.models[0]?.value ?? ""));
      })
      .catch(() => {});
  }, [diagramId, setCurrentDiagramId, setSessions]);

  const handleModelSelect = (value: string) => {
    setSelectedModel(value);
    localStorage.setItem(MODEL_STORAGE_KEY, value);
  };

  return { models, selectedModel, handleModelSelect };
};
