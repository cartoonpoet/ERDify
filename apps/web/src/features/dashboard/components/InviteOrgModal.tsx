import { useState, type FormEvent } from "react";
import { Modal, Button, Input } from "../../../design-system";
import { useInvites } from "../hooks/useInvites";
import { form, footer, selectInput } from "./modal-form.css";
import * as css from "./invite-org-modal.css";

interface InviteOrgModalProps {
  open: boolean;
  onClose: () => void;
  orgId: string;
}

export const InviteOrgModal = ({ open, onClose, orgId }: InviteOrgModalProps) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [result, setResult] = useState<"added" | "pending" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { invite, isInviting } = useInvites(orgId);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    try {
      const res = await invite(email.trim(), role);
      setResult(res.status);
      setEmail("");
    } catch {
      setError("초대에 실패했습니다.");
    }
  };

  const handleClose = () => {
    setEmail("");
    setRole("editor");
    setResult(null);
    setError(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="멤버 초대">
      {result ? (
        <div className={css.resultWrapper}>
          <div className={css.resultIcon}>{result === "added" ? "✓" : "✉"}</div>
          <div className={css.resultText}>
            {result === "added" ? "멤버로 추가되었습니다." : "가입 초대 메일을 보냈습니다."}
          </div>
          <div className={css.resultFooter}>
            <Button variant="secondary" size="md" onClick={() => { setResult(null); setRole("editor"); setError(null); }}>
              추가 초대
            </Button>
            <Button variant="primary" size="md" onClick={handleClose}>
              닫기
            </Button>
          </div>
        </div>
      ) : (
        <form className={form} onSubmit={handleSubmit}>
          <Input
            id="invite-email"
            label="이메일"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            {...(error ? { error } : {})}
            required
            autoFocus
          />
          <div>
            <label htmlFor="invite-role" className={css.label}>역할</label>
            <select
              id="invite-role"
              className={selectInput}
              value={role}
              onChange={(e) => setRole(e.target.value as "editor" | "viewer")}
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <div className={footer}>
            <Button variant="secondary" size="md" type="button" onClick={handleClose}>
              취소
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={isInviting || !email.trim()}
            >
              {isInviting ? "초대 중..." : "초대 보내기"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
