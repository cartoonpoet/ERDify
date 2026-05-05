import { useState } from "react";
import { Modal } from "../../../design-system";
import { generateDdl } from "../../../shared/utils/ddl-generator";
import { useEditorStore } from "../stores/useEditorStore";
import { copyToClipboard } from "../../../shared/utils/clipboard";
import { body, toolbar, actionBtn, copySuccessBtn, codeBlock, emptyText } from "./ExportDdlModal.css";

interface ExportDdlModalProps {
  open: boolean;
  diagramName: string;
  onClose: () => void;
}

export const ExportDdlModal = ({ open, diagramName, onClose }: ExportDdlModalProps) => {
  const document = useEditorStore((s) => s.document);
  const [copied, setCopied] = useState(false);

  const ddl = document ? generateDdl(document) : "";

  function handleCopy() {
    copyToClipboard(ddl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownload() {
    const blob = new Blob([ddl], { type: "text/sql" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${diagramName.replace(/[^a-zA-Z0-9_-]/g, "_")}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Modal open={open} onClose={onClose} title="DDL 내보내기">
      <div className={body}>
        {ddl ? (
          <>
            <div className={toolbar}>
              <button
                className={copied ? copySuccessBtn : actionBtn}
                onClick={handleCopy}
                type="button"
              >
                {copied ? "복사됨 ✓" : "클립보드 복사"}
              </button>
              <button className={actionBtn} onClick={handleDownload} type="button">
                .sql 다운로드
              </button>
            </div>
            <pre className={codeBlock}>{ddl}</pre>
          </>
        ) : (
          <div className={emptyText}>테이블이 없습니다. 먼저 ERD를 작성해 주세요.</div>
        )}
      </div>
    </Modal>
  );
};
