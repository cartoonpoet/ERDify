import { useState } from "react";
import { Modal } from "../../../design-system";
import { generateDdl } from "../../../shared/utils/ddl-generator";
import { useEditorStore } from "../stores/useEditorStore";
import { copyToClipboard } from "../../../shared/utils/clipboard";
import { DarkCodeEditor } from "../../../shared/components/DarkCodeEditor";
import { body, toolbar, filenameLabel, toolbarBtns, actionBtn, copySuccessBtn, emptyText } from "./ExportDdlModal.css";

interface ExportDdlModalProps {
  open: boolean;
  diagramName: string;
  onClose: () => void;
}

export const ExportDdlModal = ({ open, diagramName, onClose }: ExportDdlModalProps) => {
  const document = useEditorStore((s) => s.document);
  const [copied, setCopied] = useState(false);

  const ddl = document ? generateDdl(document) : "";
  const filename = `${diagramName.replace(/[^a-zA-Z0-9_-]/g, "_")}.sql`;

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
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Modal open={open} onClose={onClose} title="DDL 내보내기" maxWidth="680px">
      <div className={body}>
        {ddl ? (
          <>
            <div className={toolbar}>
              <span className={filenameLabel}>{filename}</span>
              <div className={toolbarBtns}>
                <button
                  className={copied ? copySuccessBtn : actionBtn}
                  onClick={handleCopy}
                  type="button"
                >
                  {copied ? "✓ 복사됨" : "📋 복사"}
                </button>
                <button className={actionBtn} onClick={handleDownload} type="button">
                  ⬇ 다운로드
                </button>
              </div>
            </div>
            <DarkCodeEditor value={ddl} height="400px" />
          </>
        ) : (
          <div className={emptyText}>테이블이 없습니다. 먼저 ERD를 작성해 주세요.</div>
        )}
      </div>
    </Modal>
  );
};
