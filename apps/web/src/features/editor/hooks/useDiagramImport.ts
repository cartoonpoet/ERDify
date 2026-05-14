import { useState, useRef } from "react";
import type { DragEvent, ChangeEvent } from "react";
import { randomUUID } from "@/shared/utils/uuid";
import { createDiagram } from "@/shared/api/diagrams.api";
import { parseDdl } from "@/shared/utils/ddl-parser";
import { parseExerd } from "@/shared/utils/exerd-parser";
import type { DiagramDialect } from "@erdify/domain";

export type TabType = DiagramDialect | "exerd";

const extractFirstTableName = (sql: string): string | null => {
  const m = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:\[?[\w.]+\]?\.)?[\["`]?([\w]+)[\]"`]?\s*\(/i);
  return m ? (m[1] ?? null) : null;
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

  const handleExerdDrop = (e: DragEvent<HTMLDivElement>) => {
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
