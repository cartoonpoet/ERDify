import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/queryKeys";
import { Button } from "@/components";
import { getOrgAiSettings, setOrgProviderKey, removeOrgProviderKey, setEnabledModels } from "@/features/ai/api/ai.api";
import { AI_PROVIDERS, PROVIDER_LABELS, modelsForProvider, type AiProviderId } from "@/features/ai/models";
import * as css from "./ai-settings-panel.css";

/** "Claude Sonnet 4.6 (권장)" → { name: "Claude Sonnet 4.6", badge: "권장" } */
const parseModelLabel = (label: string) => {
  const m = label.match(/^(.*?)\s*\((.+)\)$/);
  return m ? { name: m[1], badge: m[2] } : { name: label, badge: null };
};

const getBadgeVariant = (badge: string | null): keyof typeof css.checkboxBadge => {
  if (badge === "권장") return "blue";
  if (badge === "고성능") return "purple";
  if (badge === "저비용" || badge === "경량") return "green";
  return "gray";
};

const CheckMark = () => (
  <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
    <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PROVIDER_ICON_LABEL: Record<string, string> = {
  anthropic: "A",
  openai: "O",
  gemini: "G",
};

interface AISettingsPanelProps {
  orgId: string;
  isOwner: boolean;
}

const KEY_PLACEHOLDERS: Record<AiProviderId, string> = {
  anthropic: "sk-ant-api03-...",
  openai: "sk-...",
  gemini: "AIza...",
};

export const AISettingsPanel = ({ orgId, isOwner }: AISettingsPanelProps) => {
  const [editingProvider, setEditingProvider] = useState<AiProviderId | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [enabled, setEnabled] = useState<string[] | null>(null);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: queryKeys.orgAiSettings(orgId),
    queryFn: () => getOrgAiSettings(orgId),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.orgAiSettings(orgId) });

  const saveKey = useMutation({
    mutationFn: ({ provider, apiKey }: { provider: AiProviderId; apiKey: string }) => setOrgProviderKey(orgId, provider, apiKey),
    onSuccess: () => { void invalidate(); setEditingProvider(null); setApiKey(""); },
  });

  const removeKey = useMutation({
    mutationFn: (provider: AiProviderId) => removeOrgProviderKey(orgId, provider),
    onSuccess: () => { void invalidate(); },
  });

  const saveModels = useMutation({
    mutationFn: (models: string[]) => setEnabledModels(orgId, models),
    onSuccess: () => { void invalidate(); setEnabled(null); },
  });

  const providers = data?.providers ?? { anthropic: false, openai: false, gemini: false };
  const registered = AI_PROVIDERS.filter((p) => providers[p]);
  // 현재 편집 중인 허용목록(저장 전 로컬 상태). null이면 서버값 사용.
  const enabledModels = enabled ?? data?.enabledModels ?? [];

  const toggleModel = (value: string) => {
    const base = enabled ?? data?.enabledModels ?? [];
    setEnabled(base.includes(value) ? base.filter((v) => v !== value) : [...base, value]);
  };

  return (
    <div className={css.section}>
      <div className={css.sectionLabel}>AI 설정</div>
      <div className={css.card}>
        <div className={css.cardBody}>
          <p className={css.descText}>
            provider별 API 키를 등록하세요(여러 개 동시 등록 가능). 키는 AES-256으로 암호화 저장됩니다.
            등록한 provider의 모델 중 "사용 가능 모델"로 선택한 것이 채팅에서 노출됩니다.
          </p>
        </div>

        {/* provider별 키 */}
        {AI_PROVIDERS.map((provider) => (
          <div key={provider} className={css.statusRow}>
            <span className={css.statusLabel}>{PROVIDER_LABELS[provider]}</span>
            {providers[provider] ? (
              <span className={css.statusBadgeSet}>✓ 등록됨</span>
            ) : (
              <span className={css.statusBadgeUnset}>미설정</span>
            )}
            {isOwner && editingProvider !== provider && (
              <div className={css.actionRow}>
                <Button variant="secondary" size="sm" onClick={() => { setEditingProvider(provider); setApiKey(""); }}>
                  {providers[provider] ? "변경" : "키 설정"}
                </Button>
                {providers[provider] && (
                  <Button variant="ghost" size="sm" onClick={() => removeKey.mutate(provider)} disabled={removeKey.isPending}>
                    삭제
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}

        {isOwner && editingProvider && (
          <div className={css.inputRow}>
            <input
              className={css.input}
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={KEY_PLACEHOLDERS[editingProvider]}
              onKeyDown={(e) => { if (e.key === "Enter" && apiKey.trim()) saveKey.mutate({ provider: editingProvider, apiKey: apiKey.trim() }); }}
            />
            <Button variant="primary" size="sm" onClick={() => saveKey.mutate({ provider: editingProvider, apiKey: apiKey.trim() })} disabled={saveKey.isPending || !apiKey.trim()}>
              {saveKey.isPending ? "저장 중..." : "저장"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setEditingProvider(null); setApiKey(""); }}>취소</Button>
          </div>
        )}

        {/* 사용 가능 모델 (allowlist) */}
        {registered.length > 0 && (
          <div className={css.cardBody}>
            <div className={css.statusLabel}>사용 가능 모델</div>
            <p className={css.descText}>
              선택한 모델만 채팅에서 사용할 수 있어요. 아무것도 선택하지 않으면 등록된 provider의 모든 모델이 허용됩니다.
            </p>
            {registered.map((provider, i) => (
              <div key={provider}>
                {i > 0 && <hr className={css.providerSectionDivider} />}
                <div className={css.providerHeader}>
                  <span className={css.providerIcon[provider]}>
                    {PROVIDER_ICON_LABEL[provider]}
                  </span>
                  <span className={css.statusLabel}>{PROVIDER_LABELS[provider]}</span>
                </div>
                <div className={css.checkboxList}>
                  {modelsForProvider(provider).map((m) => {
                    const { name, badge } = parseModelLabel(m.label);
                    const isSelected = enabledModels.includes(m.value);
                    const itemClass = [
                      css.checkboxItem,
                      isSelected ? css.checkboxItemSelected : "",
                      !isOwner ? css.checkboxItemDisabled : "",
                    ]
                      .filter(Boolean)
                      .join(" ");
                    const boxClass = [
                      css.customCheckbox,
                      isSelected ? css.customCheckboxChecked : "",
                    ]
                      .filter(Boolean)
                      .join(" ");
                    return (
                      <div
                        key={m.value}
                        className={itemClass}
                        role="button"
                        tabIndex={isOwner ? 0 : -1}
                        onClick={() => isOwner && toggleModel(m.value)}
                        onKeyDown={(e) => e.key === "Enter" && isOwner && toggleModel(m.value)}
                      >
                        <div className={boxClass}>
                          {isSelected && <CheckMark />}
                        </div>
                        <span className={css.checkboxLabel}>
                          {name}
                          {badge && <span className={css.checkboxBadge[getBadgeVariant(badge)]}>{badge}</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {isOwner && enabled !== null && (
              <div className={css.actionRow}>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => saveModels.mutate(enabled)}
                  disabled={saveModels.isPending}
                >
                  {saveModels.isPending ? "저장 중..." : "모델 설정 저장"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEnabled(null)}>
                  취소
                </Button>
              </div>
            )}
          </div>
        )}

        {(saveKey.isError || removeKey.isError || saveModels.isError) && (
          <p className={css.errorText}>저장에 실패했습니다. 다시 시도해주세요.</p>
        )}

        {!isOwner && (
          <p className={css.readonlyNote}>API 키·모델 설정은 조직 소유자만 가능합니다.</p>
        )}
      </div>
    </div>
  );
};
