import { useRef } from "react";
import type { DragEvent, UIEvent } from "react";
import * as css from "./DarkCodeEditor.css";

interface DarkCodeEditorProps {
  value: string;
  onChange?: (v: string) => void;
  onFileDrop?: (file: File) => void;
  height?: string;
  placeholder?: string;
  isDragOver?: boolean;
  onDragOver?: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave?: () => void;
}

export const DarkCodeEditor = ({
  value,
  onChange,
  onFileDrop,
  height = "220px",
  placeholder,
  isDragOver,
  onDragOver,
  onDragLeave,
}: DarkCodeEditorProps) => {
  const lineNumRef = useRef<HTMLDivElement>(null);
  const lineCount = Math.max(1, value ? value.split("\n").length : 1);

  const handleScroll = (e: UIEvent<HTMLTextAreaElement>) => {
    if (lineNumRef.current) {
      lineNumRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    onDragLeave?.();
    if (onFileDrop) {
      const file = e.dataTransfer.files[0];
      if (file) onFileDrop(file);
    }
  };

  return (
    <div
      className={css.container}
      style={{ height }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={handleDrop}
    >
      <div ref={lineNumRef} className={css.lineNumbers}>
        {Array.from({ length: lineCount }, (_, i) => (
          <span key={i} className={css.lineNumber}>{i + 1}</span>
        ))}
      </div>

      {onChange ? (
        <textarea
          className={css.editableArea}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          placeholder={placeholder}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
        />
      ) : (
        <pre className={css.codeArea}>
          {value || <span className={css.placeholder}>{placeholder}</span>}
        </pre>
      )}

      {isDragOver && (
        <div className={css.dragOverlay}>.sql 파일을 놓으세요</div>
      )}
    </div>
  );
};
