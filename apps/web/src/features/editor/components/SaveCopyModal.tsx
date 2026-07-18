import { useState, type SubmitEvent } from "react";
import { Modal, Button, Input } from "@/components";
import type { DiagramDialect } from "@erdify/domain";
import { form, footer, selectInput } from "@/features/dashboard/components/modal-form.css";

interface SaveCopyModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, dialect: DiagramDialect) => Promise<void>;
  defaultName: string;
  defaultDialect: DiagramDialect;
}

export const SaveCopyModal = ({ open, onClose, onSave, defaultName, defaultDialect }: SaveCopyModalProps) => {
  const [name, setName] = useState(defaultName);
  const [dialect, setDialect] = useState<DiagramDialect>(defaultDialect);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      await onSave(trimmed, dialect);
      onClose();
    } catch {
      setError("복사본 저장에 실패했습니다.");
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="복사본으로 저장">
      <form className={form} onSubmit={handleSubmit}>
        <Input
          id="save-copy-name"
          label="ERD 이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
          {...(error ? { error } : {})}
        />
        <div>
          <label htmlFor="save-copy-dialect" style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>
            데이터베이스 종류
          </label>
          <select
            id="save-copy-dialect"
            className={selectInput}
            value={dialect}
            onChange={(e) => setDialect(e.target.value as DiagramDialect)}
          >
            <option value="postgresql">PostgreSQL</option>
            <option value="mysql">MySQL</option>
            <option value="mariadb">MariaDB</option>
            <option value="mssql">MSSQL</option>
          </select>
        </div>
        <div className={footer}>
          <Button variant="secondary" size="md" type="button" onClick={onClose}>취소</Button>
          <Button variant="primary" size="md" type="submit" disabled={loading || !name.trim()}>
            {loading ? "저장 중…" : "복사본 저장"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
