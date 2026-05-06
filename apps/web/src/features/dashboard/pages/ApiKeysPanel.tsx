import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listApiKeys, createApiKey, revokeApiKey, regenerateApiKey } from "../../../shared/api/api-keys.api";
import type { ApiKeyItem, ApiKeyCreated } from "../../../shared/api/api-keys.api";
import { copyToClipboard } from "../../../shared/utils/clipboard";
import * as css from "./api-keys-panel.css";

type ExpiryPreset = "30d" | "90d" | "1y" | "none" | "custom";

const PRESET_LABELS: Record<ExpiryPreset, string> = {
  "30d": "30일",
  "90d": "90일",
  "1y": "1년",
  none: "무기한",
  custom: "직접 입력",
};

function expiresAtFromPreset(preset: ExpiryPreset, customDate: string): string | undefined {
  if (preset === "30d") return new Date(Date.now() + 30 * 86400000).toISOString();
  if (preset === "90d") return new Date(Date.now() + 90 * 86400000).toISOString();
  if (preset === "1y") return new Date(Date.now() + 365 * 86400000).toISOString();
  if (preset === "custom" && customDate) return new Date(customDate).toISOString();
  return undefined;
}

function getStatusInfo(key: ApiKeyItem): { label: string; type: "active" | "expiring" | "expired" } {
  if (!key.expiresAt) return { label: "활성", type: "active" };
  const ms = new Date(key.expiresAt).getTime() - Date.now();
  if (ms < 0) return { label: "만료됨", type: "expired" };
  if (ms < 7 * 86400000) return { label: `D-${Math.ceil(ms / 86400000)}`, type: "expiring" };
  return { label: "활성", type: "active" };
}

const BADGE_CLASS: Record<"active" | "expiring" | "expired", string> = {
  active: css.badgeActive,
  expiring: css.badgeExpiring,
  expired: css.badgeExpired,
};

export const ApiKeysPanel = () => {
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formExpiry, setFormExpiry] = useState<ExpiryPreset>("1y");
  const [formCustomDate, setFormCustomDate] = useState("");

  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
  const [confirmRegenerateId, setConfirmRegenerateId] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<ApiKeyCreated | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: listApiKeys,
  });

  const createMutation = useMutation({
    mutationFn: createApiKey,
    onSuccess: (data) => {
      setRevealedKey(data);
      setShowForm(false);
      setFormName("");
      setFormExpiry("1y");
      setFormCustomDate("");
      void queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: revokeApiKey,
    onSuccess: () => {
      setConfirmRevokeId(null);
      void queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: regenerateApiKey,
    onSuccess: (data) => {
      setRevealedKey(data);
      setConfirmRegenerateId(null);
      void queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });

  function handleCreate() {
    if (formExpiry === "custom" && formCustomDate) {
      if (new Date(formCustomDate).getTime() <= Date.now()) return;
    }
    const expiresAt = expiresAtFromPreset(formExpiry, formCustomDate);
    const trimmedName = formName.trim();
    const body: { name?: string; expiresAt?: string } = {};
    if (trimmedName) body.name = trimmedName;
    if (expiresAt) body.expiresAt = expiresAt;
    createMutation.mutate(body);
  }

  async function handleCopyKey() {
    if (!revealedKey) return;
    await copyToClipboard(revealedKey.apiKey);
    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  }

  function handleDismissReveal() {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    setRevealedKey(null);
    setCopied(false);
  }

  return (
    <div className={css.page}>
      <div className={css.header}>
        <div>
          <h1 className={css.title}>API 키</h1>
          <p className={css.subtitle}>HTTP 헤더 X-Api-Key 또는 Bearer 토큰으로 사용</p>
        </div>
        <button className={css.createBtn} onClick={() => setShowForm((v) => !v)}>
          {showForm ? "취소" : "+ 새 키 생성"}
        </button>
      </div>

      {showForm && (
        <div className={css.createForm}>
          <div className={css.formRow}>
            <label className={css.label}>
              키 이름 <span className={css.optional}>(선택)</span>
            </label>
            <input
              className={css.input}
              type="text"
              placeholder="예: Production, Claude MCP"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              maxLength={100}
            />
          </div>
          <div className={css.formRow}>
            <label className={css.label}>만료 기간</label>
            <div className={css.chips}>
              {(["30d", "90d", "1y", "none", "custom"] as ExpiryPreset[]).map((p) => (
                <button
                  key={p}
                  className={formExpiry === p ? css.chipActive : css.chip}
                  onClick={() => setFormExpiry(p)}
                >
                  {PRESET_LABELS[p]}
                </button>
              ))}
            </div>
            {formExpiry === "custom" && (
              <input
                className={css.input}
                type="date"
                value={formCustomDate}
                onChange={(e) => setFormCustomDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                style={{ marginTop: 8 }}
              />
            )}
          </div>
          <div className={css.formActions}>
            <button
              className={css.createSubmitBtn}
              onClick={handleCreate}
              disabled={createMutation.isPending || (formExpiry === "custom" && !formCustomDate)}
            >
              {createMutation.isPending ? "생성 중..." : "키 생성"}
            </button>
          </div>
          {createMutation.isError && <p className={css.errorMsg}>키 생성에 실패했습니다.</p>}
        </div>
      )}

      {revealedKey && (
        <div className={css.revealBox}>
          <p className={css.revealWarning}>
            이 키는 지금만 표시됩니다. 안전한 곳에 복사해 보관하세요.
          </p>
          <div className={css.keyBox}>
            <span className={css.keyText}>{revealedKey.apiKey}</span>
            <button
              className={copied ? css.copySuccessBtn : css.copyBtn}
              onClick={handleCopyKey}
            >
              {copied ? "복사됨 ✓" : "복사"}
            </button>
          </div>
          <button className={css.confirmBtn} onClick={handleDismissReveal}>확인</button>
        </div>
      )}

      {isLoading ? (
        <p className={css.emptyMsg}>불러오는 중...</p>
      ) : keys.length === 0 ? (
        <p className={css.emptyMsg}>API 키가 없습니다. 새 키를 생성해주세요.</p>
      ) : (
        <>
          <div className={css.sectionLabel}>활성 키 · {keys.length}개</div>
          <div className={css.card}>
            {keys.map((key) => {
              const status = getStatusInfo(key);
              return (
                <div key={key.id} className={css.keyRow}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={css.keyName}>{key.name ?? "—"}</div>
                    <div className={css.keyMeta}>
                      <span>{key.prefix}••••</span>
                      <span> · {key.expiresAt ? new Date(key.expiresAt).toLocaleDateString("ko-KR") : "무기한"}</span>
                    </div>
                  </div>
                  <span className={BADGE_CLASS[status.type]}>{status.label}</span>
                  {confirmRegenerateId === key.id ? (
                    <div className={css.confirmInline}>
                      <span>기존 키가 즉시 무효화됩니다.</span>
                      <button
                        className={css.confirmYesBtn}
                        onClick={() => regenerateMutation.mutate(key.id)}
                        disabled={regenerateMutation.isPending}
                      >
                        확인
                      </button>
                      <button
                        className={css.confirmNoBtn}
                        onClick={() => setConfirmRegenerateId(null)}
                      >
                        취소
                      </button>
                    </div>
                  ) : confirmRevokeId === key.id ? (
                    <div className={css.confirmInline}>
                      <span>정말 폐기할까요?</span>
                      <button
                        className={css.confirmYesBtn}
                        onClick={() => revokeMutation.mutate(key.id)}
                        disabled={revokeMutation.isPending}
                      >
                        확인
                      </button>
                      <button
                        className={css.confirmNoBtn}
                        onClick={() => setConfirmRevokeId(null)}
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        className={css.actionBtn}
                        onClick={() => setConfirmRegenerateId(key.id)}
                      >
                        재생성
                      </button>
                      <button
                        className={css.actionBtnDanger}
                        onClick={() => setConfirmRevokeId(key.id)}
                      >
                        폐기
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
