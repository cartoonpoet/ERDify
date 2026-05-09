import type { MouseEvent } from "react";
import { Modal, Button } from "../../../design-system";
import { DarkCodeEditor } from "../../../shared/components/DarkCodeEditor";
import { useDiagramImport } from "../hooks/useDiagramImport";
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

export const ImportDiagramModal = ({ open, projectId, onClose, onImported }: ImportDiagramModalProps) => {
  const {
    activeTab,
    name, setName,
    exerdFile,
    sqlFiles,
    ddlText,
    isDragOver, setIsDragOver,
    isDdlDragOver, setIsDdlDragOver,
    error,
    loading,
    canSubmit,
    fileInputRef,
    sqlFileInputRef,
    handleTabSwitch,
    handleDdlChange,
    acceptSqlFiles,
    handleSqlFileChange,
    removeSqlFile,
    handleExerdDrop,
    handleExerdFileChange,
    handleClearExerdFile,
    handleClose,
    handleSubmit,
  } = useDiagramImport({ projectId, onImported, onClose });

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
