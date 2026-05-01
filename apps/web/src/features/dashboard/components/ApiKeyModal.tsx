import { useState } from "react";
import { Modal } from "../../../design-system/Modal";
import { generateApiKey } from "../../../shared/api/auth.api";
import * as css from "./ApiKeyModal.css";

interface ApiKeyModalProps {
  open: boolean;
  onClose: () => void;
}

export const ApiKeyModal = ({ open, onClose }: ApiKeyModalProps) => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const { apiKey: key } = await generateApiKey();
      setApiKey(key);
    } catch {
      setError("API 키 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!apiKey) return;
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal open={open} onClose={onClose} title="MCP API 키">
      <div className={css.body}>
        <p className={css.description}>
          Claude Desktop 등 MCP 클라이언트를 ERDify에 연결할 때 사용하는 키입니다.
        </p>

        {!apiKey && (
          <button className={css.generateBtn} onClick={handleGenerate} disabled={loading}>
            {loading ? "생성 중..." : "API 키 생성"}
          </button>
        )}

        {error && <p style={{ color: "red", fontSize: 13, margin: 0 }}>{error}</p>}

        {apiKey && (
          <>
            <p className={css.warning}>
              이 키는 지금만 표시됩니다. 안전한 곳에 복사해 보관하세요.
            </p>
            <div className={css.keyBox}>
              <span className={css.keyText}>{apiKey}</span>
              <button
                className={copied ? css.copySuccessBtn : css.copyBtn}
                onClick={handleCopy}
              >
                {copied ? "복사됨 ✓" : "복사"}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
