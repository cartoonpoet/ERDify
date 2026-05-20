import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components";
import { getOrgAiSettings, updateOrgAiSettings } from "@/features/ai/api/ai.api";
import * as css from "./ai-settings-panel.css";

interface AISettingsPanelProps {
  orgId: string;
  isOwner: boolean;
}

export const AISettingsPanel = ({ orgId, isOwner }: AISettingsPanelProps) => {
  const [apiKey, setApiKey] = useState("");
  const [showInput, setShowInput] = useState(false);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["org-ai-settings", orgId],
    queryFn: () => getOrgAiSettings(orgId),
  });

  const mutation = useMutation({
    mutationFn: (key: string) => updateOrgAiSettings(orgId, key),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["org-ai-settings", orgId] });
      setApiKey("");
      setShowInput(false);
    },
  });

  const handleSave = () => {
    if (!apiKey.trim()) return;
    mutation.mutate(apiKey.trim());
  };

  const hasApiKey = data?.hasApiKey ?? false;

  return (
    <div className={css.section}>
      <div className={css.sectionLabel}>AI 설정</div>
      <div className={css.card}>
        <div className={css.statusRow}>
          <span className={css.statusLabel}>Anthropic API 키</span>
          {hasApiKey ? (
            <span className={css.statusBadgeSet}>
              ✓ 설정됨
            </span>
          ) : (
            <span className={css.statusBadgeUnset}>미설정</span>
          )}
        </div>

        <div className={css.cardBody}>
          <p className={css.descText}>
            ERDify AI 기능(채팅, 컬럼 추천, ERD 자동 생성)을 사용하려면 Anthropic Claude API 키가 필요합니다.
            키는 AES-256으로 암호화 저장되며, AI 요청에만 사용됩니다.
          </p>
        </div>

        {isOwner && !showInput && (
          <div className={css.actionRow}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowInput(true)}
            >
              {hasApiKey ? "API 키 변경" : "API 키 설정"}
            </Button>
          </div>
        )}

        {isOwner && showInput && (
          <>
            <div className={css.inputRow}>
              <input
                className={css.input}
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              />
            </div>
            <div className={css.actionRow}>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={mutation.isPending || !apiKey.trim()}
              >
                {mutation.isPending ? "저장 중..." : "저장"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowInput(false); setApiKey(""); }}
              >
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
