import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components";
import { getOrgAiSettings, updateOrgAiSettings } from "@/features/ai/api/ai.api";
import * as css from "./ai-settings-panel.css";

interface AISettingsPanelProps {
  orgId: string;
  isOwner: boolean;
}

const OPENAI_MODELS = [
  { value: "gpt-4o", label: "GPT-4o (권장)" },
  { value: "gpt-4o-mini", label: "GPT-4o mini (저비용)" },
  { value: "gpt-4.1", label: "GPT-4.1" },
  { value: "gpt-4.1-mini", label: "GPT-4.1 mini" },
];

const ANTHROPIC_MODELS = [
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (권장)" },
  { value: "claude-opus-4-6", label: "Claude Opus 4.6 (고성능)" },
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (저비용)" },
];

export const AISettingsPanel = ({ orgId, isOwner }: AISettingsPanelProps) => {
  const [apiKey, setApiKey] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [provider, setProvider] = useState<"anthropic" | "openai">("anthropic");
  const [model, setModel] = useState("");
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["org-ai-settings", orgId],
    queryFn: () => getOrgAiSettings(orgId),
  });

  const mutation = useMutation({
    mutationFn: ({ apiKey, provider, model }: { apiKey: string; provider: "anthropic" | "openai"; model: string }) =>
      updateOrgAiSettings(orgId, apiKey, provider, model),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["org-ai-settings", orgId] });
      setApiKey("");
      setShowInput(false);
    },
  });

  const hasApiKey = data?.hasApiKey ?? false;
  const currentProvider = data?.provider ?? "anthropic";
  const currentModel = data?.model ?? "";

  const handleShowInput = () => {
    setProvider(currentProvider);
    setModel(currentModel);
    setShowInput(true);
  };

  const handleProviderChange = (next: "anthropic" | "openai") => {
    setProvider(next);
    setModel("");
  };

  const handleCancel = () => {
    setShowInput(false);
    setApiKey("");
  };

  const handleSave = () => {
    if (!apiKey.trim()) return;
    mutation.mutate({ apiKey: apiKey.trim(), provider, model });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSave();
  };

  const modelOptions = provider === "openai" ? OPENAI_MODELS : ANTHROPIC_MODELS;

  return (
    <div className={css.section}>
      <div className={css.sectionLabel}>AI 설정</div>
      <div className={css.card}>
        <div className={css.statusRow}>
          <span className={css.statusLabel}>AI API 키</span>
          {hasApiKey ? (
            <span className={css.statusBadgeSet}>
              ✓ 설정됨 ({currentProvider === "openai" ? "OpenAI" : "Anthropic"}{currentModel ? ` / ${currentModel}` : ""})
            </span>
          ) : (
            <span className={css.statusBadgeUnset}>미설정</span>
          )}
        </div>

        <div className={css.cardBody}>
          <p className={css.descText}>
            ERDify AI 기능(채팅, 컬럼 추천, ERD 자동 생성)을 사용하려면 AI API 키가 필요합니다.
            키는 AES-256으로 암호화 저장되며, AI 요청에만 사용됩니다.
          </p>
        </div>

        {isOwner && !showInput && (
          <div className={css.actionRow}>
            <Button variant="secondary" size="sm" onClick={handleShowInput}>
              {hasApiKey ? "API 키 변경" : "API 키 설정"}
            </Button>
          </div>
        )}

        {isOwner && showInput && (
          <>
            <div className={css.providerRow}>
              <label className={css.providerLabel}>
                <input type="radio" name="provider" value="anthropic" checked={provider === "anthropic"} onChange={() => handleProviderChange("anthropic")} />
                Anthropic (Claude)
              </label>
              <label className={css.providerLabel}>
                <input type="radio" name="provider" value="openai" checked={provider === "openai"} onChange={() => handleProviderChange("openai")} />
                OpenAI (GPT)
              </label>
            </div>
            <div className={css.modelRow}>
              <select className={css.modelSelect} value={model} onChange={(e) => setModel(e.target.value)}>
                <option value="">기본 모델 사용</option>
                {modelOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className={css.inputRow}>
              <input
                className={css.input}
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={provider === "openai" ? "sk-..." : "sk-ant-api03-..."}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div className={css.actionRow}>
              <Button variant="primary" size="sm" onClick={handleSave} disabled={mutation.isPending || !apiKey.trim()}>
                {mutation.isPending ? "저장 중..." : "저장"}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                취소
              </Button>
            </div>
          </>
        )}

        {mutation.isError && (
          <p className={css.errorText}>저장에 실패했습니다. API 키를 확인해주세요.</p>
        )}

        {!isOwner && (
          <p className={css.readonlyNote}>API 키 설정은 조직 소유자만 가능합니다.</p>
        )}
      </div>
    </div>
  );
};
