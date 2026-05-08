import { randomUUID } from "../../../shared/utils/uuid";
import { useState, useRef } from "react";
import type { DragEvent, ChangeEvent, MouseEvent } from "react";
import { Modal, Button } from "../../../design-system";
import { createDiagram } from "../../../shared/api/diagrams.api";
import { parseDdl } from "../../../shared/utils/ddl-parser";
import { parseExerd } from "../../../shared/utils/exerd-parser";
import { DarkCodeEditor } from "../../../shared/components/DarkCodeEditor";
import type { DiagramDialect } from "@erdify/domain";
import {
  tabRow, tab, tabActive,
  nameField, fieldLabel, textInput,
  sectionHeader, sectionTitle, sectionDesc, sqlBrowseRow, sqlBrowseBtn,
  hintBox, hintIcon,
  dropzone, dropzoneActive, dropzoneIcon, dropzoneHint,
  fileChosen, fileChosenName, fileClearBtn,
  errorText, footer, cancelBtn,
} from "./ImportDiagramModal.css";

type TabType = DiagramDialect | "exerd";

const DIALECT_TABS: { label: string; value: DiagramDialect }[] = [
  { label: "MySQL", value: "mysql" },
  { label: "PostgreSQL", value: "postgresql" },
  { label: "MariaDB", value: "mariadb" },
  { label: "MSSQL", value: "mssql" },
];

interface ImportDiagramModalProps {
  open: boolean;
  projectId: string;
  onClose: () => void;
  onImported: (diagramId: string) => void;
}

function extractFirstTableName(sql: string): string | null {
  const m = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:\[?[\w.]+\]?\.)?[\["`]?([\w]+)[\]"`]?\s*\(/i);
  return m ? (m[1] ?? null) : null;
}

export const ImportDiagramModal = ({ open, projectId, onClose, onImported }: ImportDiagramModalProps) => {
  const [activeTab, setActiveTab] = useState<TabType>("mysql");
  const [name, setName] = useState("");
  const [exerdFile, setExerdFile] = useState<File | null>(null);
  const [sqlFiles, setSqlFiles] = useState<File[]>([]);
  const [ddlText, setDdlText] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDdlDragOver, setIsDdlDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sqlFileInputRef = useRef<HTMLInputElement>(null);

  const dialect: DiagramDialect = activeTab === "exerd" ? "mysql" : activeTab;

  function handleTabSwitch(t: TabType) {
    setActiveTab(t);
    setError(null);
  }

  function handleDdlChange(v: string) {
    setDdlText(v);
    if (!name.trim()) {
      const detected = extractFirstTableName(v);
      if (detected) setName(detected);
    }
  }

  const acceptSqlFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    const invalid = arr.filter((f) => !f.name.endsWith(".sql"));
    if (invalid.length > 0) {
      setError(".sql 파일만 지원합니다.");
      return;
    }
    setSqlFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      return [...prev, ...arr.filter((f) => !existing.has(f.name))];
    });
    if (!name.trim() && arr[0]) setName(arr[0].name.replace(/\.sql$/, ""));
    setError(null);
  };

  const handleSqlFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) acceptSqlFiles(e.target.files);
    e.target.value = "";
  };

  const removeSqlFile = (fileName: string) =>
    setSqlFiles((prev) => prev.filter((f) => f.name !== fileName));

  function acceptExerdFile(file: File) {
    if (!file.name.endsWith(".exerd") && !file.name.endsWith(".xml")) {
      setError(".exerd 또는 .xml 파일만 지원합니다.");
      return;
    }
    setExerdFile(file);
    if (!name.trim()) setName(file.name.replace(/\.(exerd|xml)$/, ""));
    setError(null);
  }

  function handleExerdDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) acceptExerdFile(file);
  }

  function handleExerdFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file) acceptExerdFile(file);
  }

  function handleClearExerdFile() {
    setExerdFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit() {
    setError(null);
    const diagramName = name.trim();
    if (!diagramName) { setError("다이어그램 이름을 입력하세요."); return; }

    if (activeTab === "exerd" && !exerdFile) { setError("ExERD 파일을 선택하세요."); return; }
    if (activeTab !== "exerd" && sqlFiles.length === 0 && !ddlText.trim()) {
      setError("DDL SQL을 입력하거나 파일을 선택하세요.");
      return;
    }

    setLoading(true);
    try {
      let content: object;
      if (activeTab === "exerd") {
        const xmlText = await exerdFile!.text();
        const parsed = parseExerd(xmlText);
        const now = new Date().toISOString();
        content = {
          format: "erdify.schema.v1",
          id: randomUUID(),
          name: diagramName,
          dialect: "mysql" as DiagramDialect,
          ...parsed,
          metadata: { revision: 1, stableObjectIds: true, createdAt: now, updatedAt: now },
        };
      } else {
        let sqlContent = ddlText;
        if (sqlFiles.length > 0) {
          const texts = await Promise.all(sqlFiles.map((f) => f.text()));
          sqlContent = texts.join("\n\n");
        }
        content = parseDdl(sqlContent, dialect);
      }
      const created = await createDiagram(projectId, { name: diagramName, dialect, content });
      onImported(created.id);
      onClose();
      resetState();
    } catch (e) {
      setError(e instanceof Error ? e.message : "가져오기에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function resetState() {
    setName("");
    setActiveTab("mysql");
    setExerdFile(null);
    setSqlFiles([]);
    setDdlText("");
    setError(null);
  }

  function handleClose() { resetState(); onClose(); }

  const canSubmit = !loading && !!name.trim() &&
    (activeTab === "exerd" ? !!exerdFile : (sqlFiles.length > 0 || !!ddlText.trim()));

  return (
    <Modal open={open} onClose={handleClose} title="DDL 가져오기" maxWidth="680px">
      <div className={tabRow}>
        {DIALECT_TABS.map((t) => (
          <button
            key={t.value}
            className={[tab, activeTab === t.value ? tabActive : ""].join(" ")}
            onClick={() => handleTabSwitch(t.value)}
            type="button"
          >
            {t.label}
          </button>
        ))}
        <button
          className={[tab, activeTab === "exerd" ? tabActive : ""].join(" ")}
          onClick={() => handleTabSwitch("exerd")}
          type="button"
        >
          ExERD 파일
        </button>
      </div>

      <div className={nameField}>
        <label className={fieldLabel} htmlFor="import-name">다이어그램 이름</label>
        <input
          id="import-name"
          className={textInput}
          placeholder="예: 회원 서비스 ERD"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>

      {activeTab !== "exerd" ? (
        <>
          <div className={sectionHeader}>
            <div className={sqlBrowseRow}>
              <div>
                <div className={sectionTitle}>SQL 불러넣기</div>
                <div className={sectionDesc}>
                  .sql 파일을 선택하거나 SQL을 직접 입력하세요.
                  스키마별로 분리된 파일을 여러 개 선택하면 하나의 ERD로 합칩니다.
                </div>
              </div>
              <button
                type="button"
                className={sqlBrowseBtn}
                onClick={(e: MouseEvent) => { e.stopPropagation(); sqlFileInputRef.current?.click(); }}
              >
                📂 .sql 파일 선택
              </button>
            </div>
          </div>

          {/* 선택된 파일 목록 */}
          {sqlFiles.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
              {sqlFiles.map((f) => (
                <div key={f.name} className={fileChosen}>
                  <span className={fileChosenName}>{f.name}</span>
                  <button
                    type="button"
                    className={fileClearBtn}
                    onClick={() => removeSqlFile(f.name)}
                    aria-label={`${f.name} 제거`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* SQL 직접 입력 (파일 없을 때) */}
          {sqlFiles.length === 0 && (
            <DarkCodeEditor
              value={ddlText}
              onChange={handleDdlChange}
              onFileDrop={(file) => acceptSqlFiles([file])}
              height="280px"
              placeholder={"CREATE TABLE users (\n  id INT NOT NULL,\n  name VARCHAR(100)\n);"}
              isDragOver={isDdlDragOver}
              onDragOver={(e) => { e.preventDefault(); setIsDdlDragOver(true); }}
              onDragLeave={() => setIsDdlDragOver(false)}
            />
          )}

          <input
            ref={sqlFileInputRef}
            type="file"
            accept=".sql"
            multiple
            style={{ display: "none" }}
            onChange={handleSqlFileChange}
          />
          <div className={hintBox}>
            <span className={hintIcon}>✦</span>
            <span>COMMENT는 논리명으로 자동 매핑됩니다. FK는 관계선으로 변환됩니다. 스키마 한정자(schema.table)도 인식합니다.</span>
          </div>
        </>
      ) : (
        <>
          <div
            className={[dropzone, isDragOver ? dropzoneActive : ""].join(" ")}
            onDrop={handleExerdDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
          >
            <div className={dropzoneIcon}>📂</div>
            <div>클릭하거나 파일을 여기에 끌어다 놓으세요</div>
            <div className={dropzoneHint}>.exerd, .xml 파일 지원</div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".exerd,.xml"
            style={{ display: "none" }}
            onChange={handleExerdFileChange}
          />
          {exerdFile && (
            <div className={fileChosen}>
              <span className={fileChosenName}>{exerdFile.name}</span>
              <button className={fileClearBtn} onClick={handleClearExerdFile} type="button" aria-label="파일 제거">×</button>
            </div>
          )}
        </>
      )}

      {error && <div className={errorText}>{error}</div>}

      <div className={footer}>
        <button className={cancelBtn} onClick={handleClose} type="button">취소</button>
        <Button variant="primary" size="md" onClick={handleSubmit} disabled={!canSubmit}>
          {loading ? "변환 중..." : "ERD로 변환 →"}
        </Button>
      </div>
    </Modal>
  );
};
