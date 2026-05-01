import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, Check } from "lucide-react";
import { Modal } from "../../../design-system";
import { shareDiagram, revokeDiagramShare } from "../../../shared/api/diagrams.api";
import type { SharePreset } from "../../../shared/api/diagrams.api";
import * as css from "./share-diagram-modal.css";

const PRESET_LABELS: Record<SharePreset, string> = {
  "1h": "1시간",
  "1d": "1일",
  "7d": "7일",
  "30d": "30일",
};

const PRESETS: SharePreset[] = ["1h", "1d", "7d", "30d"];

interface ShareDiagramModalProps {
  open: boolean;
  diagramId: string;
  initialShareToken: string | null;
  initialExpiresAt: string | null;
  onClose: () => void;
}

export const ShareDiagramModal = ({
  open,
  diagramId,
  initialShareToken,
  initialExpiresAt,
  onClose,
}: ShareDiagramModalProps) => {
  const queryClient = useQueryClient();
  const [shareToken, setShareToken] = useState(initialShareToken);
  const [expiresAt, setExpiresAt] = useState(initialExpiresAt);
  const [copied, setCopied] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shareUrl = shareToken ? `${window.location.origin}/share/${shareToken}` : null;

  const shareMutation = useMutation({
    mutationFn: (preset: SharePreset) => shareDiagram(diagramId, preset),
    onSuccess: (data) => {
      setMutationError(null);
      setShareToken(data.shareToken);
      setExpiresAt(data.expiresAt);
      void queryClient.invalidateQueries({ queryKey: ["diagram", diagramId] });
    },
    onError: () => setMutationError("링크 생성에 실패했습니다."),
  });

  const revokeMutation = useMutation({
    mutationFn: () => revokeDiagramShare(diagramId),
    onSuccess: () => {
      setMutationError(null);
      setShareToken(null);
      setExpiresAt(null);
      void queryClient.invalidateQueries({ queryKey: ["diagram", diagramId] });
    },
    onError: () => setMutationError("링크 비활성화에 실패했습니다."),
  });

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      setCopied(true);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard permission denied — do nothing
    }
  };

  const isLoading = shareMutation.isPending || revokeMutation.isPending;

  return (
    <Modal open={open} onClose={onClose} title="공유하기">
      <div className={css.body}>
        {shareToken ? (
          <>
            <div className={css.linkBox}>
              <input className={css.linkInput} value={shareUrl ?? ""} readOnly />
              <button className={css.copyBtn} onClick={handleCopy}>
                {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
                {copied ? "복사됨" : "복사"}
              </button>
            </div>

            {expiresAt && (
              <p className={css.expiry}>
                유효 기간: {new Date(expiresAt).toLocaleString("ko-KR")}까지
              </p>
            )}

            <div className={css.divider} />

            <p className={css.sectionLabel}>만료 시간 변경</p>
            <div className={css.presetRow}>
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  className={css.presetBtn}
                  onClick={() => shareMutation.mutate(preset)}
                  disabled={isLoading}
                >
                  {PRESET_LABELS[preset]}
                </button>
              ))}
            </div>

            <button
              className={css.revokeBtn}
              onClick={() => revokeMutation.mutate()}
              disabled={isLoading}
            >
              링크 비활성화
            </button>
          </>
        ) : (
          <>
            <p className={css.description}>
              만료 시간을 선택하면 공유 링크가 생성됩니다.
              <br />
              링크를 받은 사람은 로그인 없이 ERD를 읽기 전용으로 볼 수 있습니다.
            </p>
            <div className={css.presetRow}>
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  className={css.presetBtn}
                  onClick={() => shareMutation.mutate(preset)}
                  disabled={isLoading}
                >
                  {PRESET_LABELS[preset]}
                </button>
              ))}
            </div>
          </>
        )}
        {mutationError && (
          <p className={css.errorText}>{mutationError}</p>
        )}
      </div>
    </Modal>
  );
};
