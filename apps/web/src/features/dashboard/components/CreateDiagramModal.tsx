import { useState, type FormEvent } from "react";
import { Modal, Button, Input } from "../../../design-system";
import { createDiagram } from "../../../shared/api/diagrams.api";
import { form, footer, selectInput } from "./modal-form.css";

interface CreateDiagramModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (diagramId: string) => void;
  projectId: string;
}

export const CreateDiagramModal = ({ open, onClose, onCreated, projectId }: CreateDiagramModalProps) => {
  const [name, setName] = useState("");
  const [dialect, setDialect] = useState<"postgresql" | "mysql" | "mariadb">("postgresql");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const diagram = await createDiagram(projectId, { name: name.trim(), dialect });
      setName("");
      onCreated(diagram.id);
      onClose();
    } catch {
      setError("ERD 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="새 ERD 만들기">
      <form className={form} onSubmit={handleSubmit}>
        <Input
          label="ERD 이름"
          placeholder="예: User Schema"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error ?? undefined}
          required
          autoFocus
        />
        <div>
          <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>
            데이터베이스 종류
          </label>
          <select
            className={selectInput}
            value={dialect}
            onChange={(e) => setDialect(e.target.value as "postgresql" | "mysql" | "mariadb")}
          >
            <option value="postgresql">PostgreSQL</option>
            <option value="mysql">MySQL</option>
            <option value="mariadb">MariaDB</option>
          </select>
        </div>
        <div className={footer}>
          <Button variant="secondary" size="md" type="button" onClick={onClose}>취소</Button>
          <Button variant="primary" size="md" type="submit" disabled={loading || !name.trim()}>
            {loading ? "만드는 중..." : "만들기"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
