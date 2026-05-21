import { useState, useRef } from "react";
import type { ChangeEvent, MouseEvent } from "react";
import { Modal, Button } from "@/components";
import { parseDdl, applySeedInserts } from "@/shared/utils/ddl-parser";
import { DarkCodeEditor } from "@/features/editor/components/DarkCodeEditor";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import type { DiagramDialect } from "@erdify/domain";
import * as css from "./import-into-editor-modal.css";

const DIALECT_TABS: { label: string; value: DiagramDialect }[] = [
  { label: "MySQL", value: "mysql" },
  { label: "PostgreSQL", value: "postgresql" },
  { label: "MariaDB", value: "mariadb" },
  { label: "MSSQL", value: "mssql" },
];

interface ImportIntoEditorModalProps {
  open: boolean;
  onClose: () => void;
}

export const ImportIntoEditorModal = ({ open, onClose }: ImportIntoEditorModalProps) => {
  const [dialect, setDialect] = useState<DiagramDialect>("mysql");
  const [sqlFiles, setSqlFiles] = useState<File[]>([]);
  const [ddlText, setDdlText] = useState("");
  const [isDdlDragOver, setIsDdlDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const sqlFileInputRef = useRef<HTMLInputElement>(null);

  const applyCommand = useEditorStore((s) => s.applyCommand);
  const document = useEditorStore((s) => s.document);

  const acceptSqlFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.some((f) => !f.name.endsWith(".sql"))) {
      setError(".sql 파일만 지원합니다.");
      return;
    }
    setSqlFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      return [...prev, ...arr.filter((f) => !existing.has(f.name))];
    });
    setError(null);
  };

  const handleSqlFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) acceptSqlFiles(e.target.files);
    e.target.value = "";
  };

  const removeSqlFile = (fileName: string) =>
    setSqlFiles((prev) => prev.filter((f) => f.name !== fileName));

  async function handleSubmit() {
    if (!document) return;
    setError(null);

    let sqlContent = ddlText;
    if (sqlFiles.length > 0) {
      const texts = await Promise.all(sqlFiles.map((f) => f.text()));
      sqlContent = texts.join("\n\n");
    }
    if (!sqlContent.trim()) {
      setError("DDL SQL을 입력하거나 파일을 선택하세요.");
      return;
    }

    setLoading(true);
    try {
      const parsed = parseDdl(sqlContent, dialect);

      applyCommand((doc) => {
        // Seed-only import (no CREATE TABLE): apply INSERT INTO to existing entities
        if (parsed.entities.length === 0) {
          return {
            ...doc,
            entities: applySeedInserts(sqlContent, doc.entities),
          };
        }

        // Schema import: offset new entities to the right of existing ones
        const existingPositions = Object.values(doc.layout.entityPositions);
        const offsetX = existingPositions.length > 0
          ? Math.max(...existingPositions.map((p) => p.x)) + 400
          : 0;

        return {
          ...doc,
          entities: [...doc.entities, ...parsed.entities],
          relationships: [...doc.relationships, ...parsed.relationships],
          layout: {
            entityPositions: {
              ...doc.layout.entityPositions,
              ...Object.fromEntries(
                Object.entries(parsed.layout.entityPositions).map(([id, pos]) => [
                  id,
                  { x: pos.x + offsetX, y: pos.y },
                ])
              ),
            },
          },
        };
      });

      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "가져오기에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setSqlFiles([]);
    setDdlText("");
    setError(null);
    setLoading(false);
    onClose();
  }

  const canSubmit = !loading && (sqlFiles.length > 0 || !!ddlText.trim());

  return (
    <Modal open={open} onClose={handleClose} title="현재 ERD에 DDL 가져오기" maxWidth="660px">
      {/* Dialect tabs */}
      <div className={css.dialectTabsRow}>
        {DIALECT_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setDialect(t.value)}
            className={css.dialectTabVariants[dialect === t.value ? "active" : "inactive"]}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* File picker */}
      <div className={css.filePickerSection}>
        <div>
          <div className={css.pickerTitle}>SQL 파일 선택</div>
          <div className={css.pickerSubtitle}>
            스키마별로 분리된 파일을 여러 개 선택하면 하나의 ERD로 합칩니다.
          </div>
        </div>
        <button
          type="button"
          className={css.pickFileBtn}
          onClick={(e: MouseEvent) => { e.stopPropagation(); sqlFileInputRef.current?.click(); }}
        >
          📂 .sql 파일 선택
        </button>
      </div>

      {sqlFiles.length > 0 && (
        <div className={css.sqlFilesList}>
          {sqlFiles.map((f) => (
            <div key={f.name} className={css.sqlFileItem}>
              <span className={css.sqlFileName}>{f.name}</span>
              <button
                type="button"
                onClick={() => removeSqlFile(f.name)}
                className={css.sqlFileRemoveBtn}
                aria-label={`${f.name} 제거`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={sqlFileInputRef}
        type="file"
        accept=".sql"
        multiple
        className={css.hiddenFileInput}
        onChange={handleSqlFileChange}
      />

      {/* SQL text input (shown when no files) */}
      {sqlFiles.length === 0 && (
        <>
          <div className={css.directInputLabel}>또는 SQL 직접 입력:</div>
          <DarkCodeEditor
            value={ddlText}
            onChange={setDdlText}
            onFileDrop={(file) => acceptSqlFiles([file])}
            height="240px"
            placeholder={"CREATE TABLE Legal.Contract (\n  id BIGINT NOT NULL,\n  ...\n);"}
            isDragOver={isDdlDragOver}
            onDragOver={(e) => { e.preventDefault(); setIsDdlDragOver(true); }}
            onDragLeave={() => setIsDdlDragOver(false)}
          />
        </>
      )}

      <div className={css.infoBox}>
        <span className={css.infoIcon}>✦</span>
        <span>가져온 테이블은 현재 ERD에 추가됩니다. 스키마 한정자(예: Legal.Contract)는 자동으로 스키마로 인식됩니다.</span>
      </div>

      {error && (
        <div className={css.errorText}>{error}</div>
      )}

      <div className={css.actionsRow}>
        <button
          type="button"
          onClick={handleClose}
          className={css.cancelBtn}
        >
          취소
        </button>
        <Button variant="primary" size="md" onClick={handleSubmit} disabled={!canSubmit}>
          {loading ? "변환 중..." : "현재 ERD에 추가 →"}
        </Button>
      </div>
    </Modal>
  );
};
