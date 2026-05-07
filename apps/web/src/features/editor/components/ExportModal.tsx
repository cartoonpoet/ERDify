import { useState } from "react";
import { Modal } from "../../../design-system/Modal";
import { generateDdl, generateOrm } from "@erdify/domain";
import type { OrmType } from "@erdify/domain";
import { useEditorStore } from "../stores/useEditorStore";
import { copyToClipboard } from "../../../shared/utils/clipboard";
import { DarkCodeEditor } from "../../../shared/components/DarkCodeEditor";
import * as css from "./ExportModal.css";

interface ExportModalProps {
  open: boolean;
  diagramName: string;
  onClose: () => void;
}

type ExportTab = "sql" | OrmType;

const TABS: { label: string; value: ExportTab; ext: string; mime: string }[] = [
  { label: "SQL", value: "sql", ext: "sql", mime: "text/sql" },
  { label: "TypeORM", value: "typeorm", ext: "ts", mime: "text/plain" },
  { label: "Prisma", value: "prisma", ext: "prisma", mime: "text/plain" },
  { label: "SQLAlchemy", value: "sqlalchemy", ext: "py", mime: "text/plain" },
];

export const ExportModal = ({ open, diagramName, onClose }: ExportModalProps) => {
  const [tab, setTab] = useState<ExportTab>("sql");
  const [copied, setCopied] = useState(false);
  const document = useEditorStore((s) => s.document);

  const currentTab = TABS.find((t) => t.value === tab)!;
  const code = document
    ? tab === "sql"
      ? generateDdl(document)
      : generateOrm(document, tab as OrmType)
    : "";
  const filename =
    tab === "sql"
      ? `${diagramName.replace(/[^a-zA-Z0-9_-]/g, "_")}.sql`
      : `schema.${currentTab.ext}`;

  function handleCopy() {
    copyToClipboard(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownload() {
    const blob = new Blob([code], { type: currentTab.mime });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Modal open={open} onClose={onClose} title="내보내기" maxWidth="680px">
      <div className={css.body}>
        <div className={css.tabRow}>
          {TABS.map((t) => (
            <button
              key={t.value}
              className={`${css.tab}${tab === t.value ? ` ${css.tabActive}` : ""}`}
              onClick={() => { setTab(t.value); setCopied(false); }}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </div>

        {code ? (
          <>
            <div className={css.toolbar}>
              <span className={css.filenameLabel}>{filename}</span>
              <div className={css.toolbarBtns}>
                <button
                  className={copied ? css.copySuccessBtn : css.actionBtn}
                  onClick={handleCopy}
                  type="button"
                >
                  {copied ? "✓ 복사됨" : "📋 복사"}
                </button>
                <button className={css.actionBtn} onClick={handleDownload} type="button">
                  ⬇ 다운로드 (.{currentTab.ext})
                </button>
              </div>
            </div>
            <DarkCodeEditor value={code} height="440px" />
          </>
        ) : (
          <div className={css.emptyText}>테이블이 없습니다. 먼저 ERD를 작성해 주세요.</div>
        )}
      </div>
    </Modal>
  );
};
