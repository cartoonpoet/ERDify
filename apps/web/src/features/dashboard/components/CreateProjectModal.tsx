import { useState, type FormEvent } from "react";
import { Modal, Button, Input } from "../../../design-system";
import { createProject } from "../../../shared/api/projects.api";
import { form, footer } from "./modal-form.css";

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  orgId: string;
}

export const CreateProjectModal = ({ open, onClose, onCreated, orgId }: CreateProjectModalProps) => {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await createProject(orgId, { name: name.trim() });
      setName("");
      onCreated();
      onClose();
    } catch {
      setError("프로젝트 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="새 프로젝트 만들기">
      <form className={form} onSubmit={handleSubmit}>
        <Input
          label="프로젝트 이름"
          placeholder="예: Backend API"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error ?? undefined}
          required
          autoFocus
        />
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
