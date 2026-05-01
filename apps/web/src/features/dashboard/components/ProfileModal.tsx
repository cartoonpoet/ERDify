import { useState, type FormEvent } from "react";
import { Modal, Button, Input } from "../../../design-system";
import { getMe, updateProfile, changePassword } from "../../../shared/api/auth.api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { form, footer } from "./modal-form.css";
import * as css from "./ProfileModal.css";

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

type Tab = "profile" | "password";

export const ProfileModal = ({ open, onClose }: ProfileModalProps) => {
  const [tab, setTab] = useState<Tab>("profile");

  return (
    <Modal open={open} onClose={onClose} title="회원정보 수정">
      <div className={css.body}>
        <div className={css.tabs}>
          <button
            className={`${css.tab} ${tab === "profile" ? css.tabActive : ""}`}
            onClick={() => setTab("profile")}
          >
            프로필
          </button>
          <button
            className={`${css.tab} ${tab === "password" ? css.tabActive : ""}`}
            onClick={() => setTab("password")}
          >
            비밀번호 변경
          </button>
        </div>

        {tab === "profile" ? (
          <ProfileTab onClose={onClose} />
        ) : (
          <PasswordTab onClose={onClose} />
        )}
      </div>
    </Modal>
  );
};

const ProfileTab = ({ onClose }: { onClose: () => void }) => {
  const queryClient = useQueryClient();

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
  });

  const [name, setName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentName = name ?? me?.name ?? "";
  const currentAvatarUrl = avatarUrl ?? me?.avatarUrl ?? "";

  const mutation = useMutation({
    mutationFn: () =>
      updateProfile({
        ...(name !== null ? { name: name.trim() } : {}),
        ...(avatarUrl !== null ? { avatarUrl: avatarUrl.trim() || null } : {}),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["me"] });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
      setName(null);
      setAvatarUrl(null);
    },
    onError: () => setError("프로필 업데이트에 실패했습니다."),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    mutation.mutate();
  };

  const displayAvatarUrl = currentAvatarUrl || me?.avatarUrl;
  const initial = (me?.name?.[0] ?? me?.email?.[0] ?? "?").toUpperCase();

  return (
    <form className={form} onSubmit={handleSubmit}>
      <div className={css.avatarRow}>
        {displayAvatarUrl ? (
          <img
            src={displayAvatarUrl}
            alt="프로필 사진"
            className={css.avatarPreview}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className={css.avatarFallback}>{initial}</div>
        )}
        <div className={css.avatarUrlInput}>
          <Input
            id="avatar-url"
            label="프로필 사진 URL"
            placeholder="https://..."
            value={currentAvatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
          />
        </div>
      </div>

      <Input
        id="profile-name"
        label="이름"
        value={currentName}
        onChange={(e) => setName(e.target.value)}
        required
        autoFocus={!displayAvatarUrl}
      />

      <Input
        id="profile-email"
        label="이메일"
        value={me?.email ?? ""}
        disabled
      />

      {success && <p className={css.successMsg}>프로필이 업데이트되었습니다.</p>}
      {error && <p className={css.errorMsg}>{error}</p>}

      <div className={footer}>
        <Button variant="secondary" size="md" type="button" onClick={onClose}>닫기</Button>
        <Button variant="primary" size="md" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "저장 중..." : "저장"}
        </Button>
      </div>
    </form>
  );
};

const PasswordTab = ({ onClose }: { onClose: () => void }) => {
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
