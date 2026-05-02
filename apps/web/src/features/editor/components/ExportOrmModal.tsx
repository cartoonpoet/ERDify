import { useState } from "react";
import { Modal } from "../../../design-system/Modal";
import { generateOrm } from "@erdify/domain";
import type { OrmType } from "@erdify/domain";
import { useEditorStore } from "../stores/useEditorStore";
import * as css from "./export-orm-modal.css";

interface ExportOrmModalProps {
  open: boolean;
  onClose: () => void;
}

const TABS: { label: string; value: OrmType; ext: string }[] = [
  { label: "TypeORM", value: "typeorm", ext: "ts" },
  { label: "Prisma", value: "prisma", ext: "prisma" },
  { label: "SQLAlchemy", value: "sqlalchemy", ext: "py" },
];

export const ExportOrmModal = ({ open, onClose }: ExportOrmModalProps) => {
  const [orm, setOrm] = useState<OrmType>("typeorm");
  const [copied, setCopied] = useState(false);
  const document = useEditorStore((s) => s.document);

  const code = document ? generateOrm(document, orm) : "";
  const currentTab = TABS.find((t) => t.value === orm)!;

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownload() {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `schema.${currentTab.ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Modal open={open} onClose={onClose} title="ORM 코드 내보내기" maxWidth="640px">
      <div className={css.body}>
        <div className={css.tabRow}>
          {TABS.map((t) => (
            <button
              key={t.value}
              className={`${css.tab}${orm === t.value ? ` ${css.tabActive}` : ""}`}
              onClick={() => { setOrm(t.value); setCopied(false); }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className={css.toolbar}>
          <button className={copied ? css.copySuccessBtn : css.actionBtn} onClick={handleCopy}>
            {copied ? "✓ 복사됨" : "복사"}
          </button>
          <button className={css.actionBtn} onClick={handleDownload}>
            다운로드 (.{currentTab.ext})
          </button>
        </div>
        {code ? (
          <pre className={css.codeBlock}>{code}</pre>
        ) : (
          <div className={css.emptyText}>테이블이 없습니다</div>
        )}
      </div>
    </Modal>
  );
};
