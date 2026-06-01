import { useState, type FormEvent } from "react";
import { Button, Input } from "@/components";
import { changePassword } from "@/shared/api/auth.api";
import { useMutation } from "@tanstack/react-query";
import { form, footer } from "./modal-form.css";
import * as css from "./ProfileModal.css";

interface PasswordTabProps {
  onClose: () => void;
}

export const PasswordTab = ({ onClose }: PasswordTabProps) => {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => changePassword({ currentPassword: current, newPassword: next }),
    onSuccess: () => {
      setSuccess(true);
      setCurrent("");
      setNext("");
      setConfirm("");
      setTimeout(() => setSuccess(false), 2500);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "비밀번호 변경에 실패했습니다.");
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next !== confirm) { setError("새 비밀번호가 일치하지 않습니다."); return; }
    if (next.length < 8) { setError("비밀번호는 8자 이상이어야 합니다."); return; }
    mutation.mutate();
  };

  return (
    <form className={form} onSubmit={handleSubmit}>
      <Input
        id="current-password"
        label="현재 비밀번호"
        type="password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        required
        autoFocus
      />
      <Input
        id="new-password"
        label="새 비밀번호"
        type="password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        required
      />
      <Input
        id="confirm-password"
        label="새 비밀번호 확인"
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        required
      />

      {success && <p className={css.successMsg}>비밀번호가 변경되었습니다.</p>}
      {error && <p className={css.errorMsg}>{error}</p>}

      <div className={footer}>
        <Button variant="secondary" size="md" type="button" onClick={onClose}>닫기</Button>
        <Button
          variant="primary"
          size="md"
          type="submit"
          disabled={mutation.isPending || !current || !next || !confirm}
        >
          {mutation.isPending ? "변경 중..." : "변경"}
        </Button>
      </div>
    </form>
  );
};
