import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Modal, Button, Input } from "@/components";
import { updateDiagram } from "@/api/diagrams.api";
import type { DiagramResponse } from "@/api/diagrams.api";
import { form, footer, selectInput } from "./modal-form.css";

interface EditDiagramModalProps {
  open: boolean;
  onClose: () => void;
  diagram: DiagramResponse;
}

export const EditDiagramModal = ({ open, onClose, diagram }: EditDiagramModalProps) => {
  const queryClient = useQueryClient();

  const [name, setName] = useState(diagram.name);
  const [dialect, setDialect] = useState(diagram.content.dialect);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setLoading(true);
    setError(null);
    try {
      if (trimmedName !== diagram.name || dialect !== diagram.content.dialect) {
        await updateDiagram(diagram.id, {
          name: trimmedName,
          content: { ...diagram.content, dialect },
        });
        queryClient.invalidateQueries({ queryKey: ["diagrams", diagram.projectId] });
      }

      onClose();
    } catch {
      setError("저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="ERD 수정">
      <form className={form} onSubmit={handleSubmit}>
        <Input
          id="edit-diagram-name"
          label="ERD 이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
          {...(error ? { error } : {})}
        />
        <div>
          <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>
            데이터베이스 종류
          </label>
          <select
            className={selectInput}
            value={dialect}
            onChange={(e) => setDialect(e.target.value as typeof dialect)}
          >
            <option value="postgresql">PostgreSQL</option>
            <option value="mysql">MySQL</option>
            <option value="mariadb">MariaDB</option>
            <option value="mssql">MSSQL</option>
          </select>
        </div>
        <div className={footer}>
          <Button variant="secondary" size="md" type="button" onClick={onClose}>취소</Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
            disabled={loading || !name.trim()}
          >
            {loading ? "저장 중..." : "저장"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
