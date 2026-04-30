import { useState, type FormEvent } from "react";
import { Modal, Button, Input } from "../../../design-system";
import { createOrganization } from "../../../shared/api/organizations.api";
import { form, footer } from "./modal-form.css";

interface CreateOrgModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const CreateOrgModal = ({ open, onClose, onCreated }: CreateOrgModalProps) => {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await createOrganization({ name: name.trim() });
      setName("");
      onCreated();
      onClose();
    } catch {
      setError("조직 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="새 조직 만들기">
      <form className={form} onSubmit={handleSubmit}>
        <Input
          label="조직 이름"
          placeholder="예: Acme Corp"
          value={name}
          onChange={(e) => setName(e.target.value)}
          {...(error ? { error } : {})}
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
