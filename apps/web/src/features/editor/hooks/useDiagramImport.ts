import { useState, useRef } from "react";
import type { DragEvent, ChangeEvent } from "react";
import { randomUUID } from "@/shared/utils/uuid";
import { createDiagram } from "@/shared/api/diagrams.api";
import { parseDdl } from "@/shared/utils/ddl-parser";
import { parseExerd } from "@/shared/utils/exerd-parser";
import type { DiagramDialect } from "@erdify/domain";

export type TabType = DiagramDialect | "exerd";

// 하나의 거대한 정규식으로 "CREATE TABLE (IF NOT EXISTS)? (스키마.)?이름 (" 전체를 매칭하면
// 복잡도 상한을 넘기므로, 접두어("CREATE TABLE ...")와 식별자 패턴을 분리해 각각의 정규식
// 복잡도를 낮춘다(매칭 대상 문자열은 동일하게 유지).
const CREATE_TABLE_PREFIX_RE = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?/gi;
const TABLE_NAME_RE = /^(?:\[?[\w.]+\]?\.)?[["`]?(\w+)[\]"`]?\s*\(/;

const extractFirstTableName = (sql: string): string | null => {
  const prefixRe = new RegExp(CREATE_TABLE_PREFIX_RE.source, CREATE_TABLE_PREFIX_RE.flags);
  let prefixMatch: RegExpExecArray | null;
  while ((prefixMatch = prefixRe.exec(sql)) !== null) {
    const rest = sql.slice(prefixMatch.index + prefixMatch[0].length);
    const nameMatch = TABLE_NAME_RE.exec(rest);
    if (nameMatch) return nameMatch[1] ?? null;
    // CREATE_TABLE_PREFIX_RE는 "CREATE"+"TABLE" 리터럴을 포함해 항상 폭이 0보다 커서
    // lastIndex가 매 반복 진행하므로 별도의 무한루프 방지 가드가 필요 없다.
  }
  return null;
};

interface UseDiagramImportOptions {
  projectId: string;
  onImported: (diagramId: string) => void;
  onClose: () => void;
}

export const useDiagramImport = ({ projectId, onImported, onClose }: UseDiagramImportOptions) => {
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

  const handleTabSwitch = (t: TabType) => {
    setActiveTab(t);
    setError(null);
  };

  const handleDdlChange = (v: string) => {
    setDdlText(v);
    if (!name.trim()) {
      const detected = extractFirstTableName(v);
      if (detected) setName(detected);
    }
  };

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

  const acceptExerdFile = (file: File) => {
    if (!file.name.endsWith(".exerd") && !file.name.endsWith(".xml")) {
      setError(".exerd 또는 .xml 파일만 지원합니다.");
      return;
    }
    setExerdFile(file);
    if (!name.trim()) setName(file.name.replace(/\.(exerd|xml)$/, ""));
    setError(null);
  };

  const handleExerdDrop = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) acceptExerdFile(file);
  };

  const handleExerdFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) acceptExerdFile(file);
  };

  const handleClearExerdFile = () => {
    setExerdFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const resetState = () => {
    setName("");
    setActiveTab("mysql");
    setExerdFile(null);
    setSqlFiles([]);
    setDdlText("");
    setError(null);
  };

  const handleClose = () => { resetState(); onClose(); };

  const handleSubmit = async () => {
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
  };

  const canSubmit = !loading && !!name.trim() &&
    (activeTab === "exerd" ? !!exerdFile : (sqlFiles.length > 0 || !!ddlText.trim()));

  return {
    activeTab, dialect,
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
  };
};
