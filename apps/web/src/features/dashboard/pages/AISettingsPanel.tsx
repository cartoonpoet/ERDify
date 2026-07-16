import { useAISettings } from "@/features/dashboard/hooks/useAISettings";
import { Button } from "@/components";
import { AI_PROVIDERS, PROVIDER_LABELS, modelsForProvider } from "@/features/ai/models";
import * as css from "./ai-settings-panel.css";

const parseModelLabel = (label: string) => {
  // `(.*?)\s*\(` (lazy dot-star, `.` also matches "(") combined with a trailing `(.+)\)$` lets the
  // engine explore many equivalent ways to place the split point when the string has repeated "("
  // characters, causing catastrophic backtracking. `[^(]*` deterministically stops at the first
  // "(" instead, and `trimEnd()` drops the separating space that regex used to consume via `\s*`.
  const m = /^([^(]*)\((.+)\)$/.exec(label);
  return m ? { name: (m[1] ?? "").trimEnd(), badge: m[2] } : { name: label, badge: null };
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

export const AISettingsPanel = ({ orgId, isOwner }: AISettingsPanelProps) => {
  const {
    editingProvider,
    apiKey, setApiKey,
    enabled, setEnabled,
    providers, registered, enabledModels,
    saveKey, removeKey, saveModels,
    toggleModel,
    handleProviderEdit, handleProviderEditCancel,
  } = useAISettings(orgId);

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
                <Button variant="secondary" size="sm" onClick={handleProviderEdit(provider)}>
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
              placeholder={`${editingProvider} API Key`}
              onKeyDown={(e) => { if (e.key === "Enter" && apiKey.trim()) saveKey.mutate({ provider: editingProvider, apiKey: apiKey.trim() }); }}
            />
            <Button variant="primary" size="sm" onClick={() => saveKey.mutate({ provider: editingProvider, apiKey: apiKey.trim() })} disabled={saveKey.isPending || !apiKey.trim()}>
              {saveKey.isPending ? "저장 중..." : "저장"}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleProviderEditCancel}>취소</Button>
          </div>
        )}

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
