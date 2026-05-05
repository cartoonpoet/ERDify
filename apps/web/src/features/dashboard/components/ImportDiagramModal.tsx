import { randomUUID } from "../../../shared/utils/uuid";
import { useState, useRef } from "react";
import type { DragEvent, ChangeEvent } from "react";
import { Modal, Button } from "../../../design-system";
import { createDiagram } from "../../../shared/api/diagrams.api";
import { parseDdl } from "../../../shared/utils/ddl-parser";
import { parseExerd } from "../../../shared/utils/exerd-parser";
import type { DiagramDialect } from "@erdify/domain";
import {
  tabRow, tab, tabActive,
  field, fieldLabel, textInput, selectInput,
  dropzone, dropzoneActive, dropzoneIcon, dropzoneHint,
  fileChosen, fileChosenName, fileClearBtn,
  textarea, textareaDragOver, errorText, footer, cancelBtn, submitBtn,
  ddlLabelRow, sqlUploadBtn,
} from "./ImportDiagramModal.css";

type TabType = "exerd" | "ddl";

interface ImportDiagramModalProps {
  open: boolean;
  projectId: string;
  onClose: () => void;
  onImported: (diagramId: string) => void;
}

export const ImportDiagramModal = ({ open, projectId, onClose, onImported }: ImportDiagramModalProps) => {
  const [activeTab, setActiveTab] = useState<TabType>("ddl");
  const [name, setName] = useState("");
  const [dialect, setDialect] = useState<DiagramDialect>("postgresql");
  const [exerdFile, setExerdFile] = useState<File | null>(null);
  const [ddlText, setDdlText] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDdlDragOver, setIsDdlDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sqlFileInputRef = useRef<HTMLInputElement>(null);

  function handleTabSwitch(tab: TabType) {
    setActiveTab(tab);
    setError(null);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file) acceptFile(file);
  }

  function acceptFile(file: File) {
    if (!file.name.endsWith(".exerd") && !file.name.endsWith(".xml")) {
      setError(".exerd 또는 .xml 파일만 지원합니다.");
      return;
    }
    setExerdFile(file);
    if (!name) setName(file.name.replace(/\.(exerd|xml)$/, ""));
    setError(null);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) acceptFile(file);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  const acceptSqlFile = async (file: File) => {
    if (!file.name.endsWith(".sql")) {
      setError(".sql 파일만 지원합니다.");
      return;
    }
    const text = await file.text();
    setDdlText(text);
    if (!name) setName(file.name.replace(/\.sql$/, ""));
    setError(null);
  };

  const handleSqlFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) acceptSqlFile(file);
    e.target.value = "";
  };

  const handleDdlDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDdlDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) acceptSqlFile(file);
  };

  const handleDdlDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDdlDragOver(true);
  };

  const handleDdlDragLeave = () => setIsDdlDragOver(false);

  function handleClearFile() {
    setExerdFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit() {
    setError(null);
    const diagramName = name.trim();
    if (!diagramName) {
      setError("다이어그램 이름을 입력하세요.");
      return;
    }

    if (activeTab === "exerd" && !exerdFile) {
      setError("ExERD 파일을 선택하세요.");
      return;
    }

    if (activeTab === "ddl" && !ddlText.trim()) {
      setError("DDL SQL을 입력하세요.");
      return;
    }

    setLoading(true);
    try {
      let content: object;

      if (activeTab === "ddl") {
        content = parseDdl(ddlText, dialect);
      } else {
        const xmlText = await exerdFile!.text();
        const parsed = parseExerd(xmlText);
        const now = new Date().toISOString();
        content = {
          format: "erdify.schema.v1",
          id: randomUUID(),
          name: diagramName,
          dialect,
          ...parsed,
          metadata: { revision: 1, stableObjectIds: true, createdAt: now, updatedAt: now },
        };
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
    setDialect("postgresql");
    setExerdFile(null);
    setDdlText("");
    setError(null);
    setActiveTab("ddl");
  }

  function handleClose() {
    resetState();
    onClose();
  }

  const canSubmit = !loading && !!name.trim() &&
    (activeTab === "ddl" ? !!ddlText.trim() : !!exerdFile);

  return (
    <Modal open={open} onClose={handleClose} title="ERD 가져오기">
      <div className={tabRow}>
        <button
          className={[tab, activeTab === "ddl" ? tabActive : ""].join(" ")}
          onClick={() => handleTabSwitch("ddl")}
          type="button"
        >
          DDL 입력
        </button>
        <button
          className={[tab, activeTab === "exerd" ? tabActive : ""].join(" ")}
          onClick={() => handleTabSwitch("exerd")}
          type="button"
        >
          ExERD 파일
        </button>
      </div>

      <div className={field}>
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

      <div className={field}>
        <label className={fieldLabel} htmlFor="import-dialect">데이터베이스</label>
        <select
          id="import-dialect"
          className={selectInput}
          value={dialect}
          onChange={(e) => setDialect(e.target.value as DiagramDialect)}
        >
          <option value="postgresql">PostgreSQL</option>
          <option value="mysql">MySQL</option>
          <option value="mariadb">MariaDB</option>
        </select>
      </div>

      {activeTab === "ddl" ? (
        <div className={field}>
          <div className={ddlLabelRow}>
            <label className={fieldLabel} htmlFor="import-ddl">DDL SQL</label>
            <button
              type="button"
              className={sqlUploadBtn}
              onClick={() => sqlFileInputRef.current?.click()}
            >
              📂 .sql 파일 불러오기
            </button>
          </div>
          <div
            onDrop={handleDdlDrop}
            onDragOver={handleDdlDragOver}
            onDragLeave={handleDdlDragLeave}
          >
            <textarea
              id="import-ddl"
              className={[textarea, isDdlDragOver ? textareaDragOver : ""].join(" ")}
              placeholder={"CREATE TABLE users (\n  id SERIAL PRIMARY KEY,\n  name VARCHAR(100) NOT NULL\n);"}
              value={ddlText}
              onChange={(e) => setDdlText(e.target.value)}
              spellCheck={false}
            />
          </div>
          <input
            ref={sqlFileInputRef}
            type="file"
            accept=".sql"
            style={{ display: "none" }}
            onChange={handleSqlFileChange}
          />
        </div>
      ) : (
        <div className={field}>
          <label className={fieldLabel}>ExERD 파일</label>
          <div
            className={[dropzone, isDragOver ? dropzoneActive : ""].join(" ")}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
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
            onChange={handleFileChange}
          />
          {exerdFile && (
            <div className={fileChosen}>
              <span className={fileChosenName}>{exerdFile.name}</span>
              <button className={fileClearBtn} onClick={handleClearFile} type="button" aria-label="파일 제거">×</button>
            </div>
          )}
        </div>
      )}

      {error && <div className={errorText}>{error}</div>}

      <div className={footer}>
        <button className={cancelBtn} onClick={handleClose} type="button">취소</button>
        <Button variant="primary" size="md" onClick={handleSubmit} disabled={!canSubmit}>
          {loading ? "가져오는 중..." : "가져오기"}
        </Button>
      </div>
    </Modal>
  );
};
