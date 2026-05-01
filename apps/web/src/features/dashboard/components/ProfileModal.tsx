import { useRef, useState, type FormEvent, type ChangeEvent, type DragEvent } from "react";
import { Modal, Button, Input } from "../../../design-system";
import { getMe, updateProfile, uploadAvatar, changePassword } from "../../../shared/api/auth.api";
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });

  const [name, setName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentName = name ?? me?.name ?? "";
  const displayAvatar = previewUrl ?? me?.avatarUrl ?? null;
  const initial = (me?.name?.[0] ?? me?.email?.[0] ?? "?").toUpperCase();

  const avatarMutation = useMutation({
    mutationFn: (file: File) => uploadAvatar(file),
    onSuccess: (updated) => { void queryClient.setQueryData(["me"], updated); },
    onError: () => setError("이미지 업로드에 실패했습니다."),
  });

  const profileMutation = useMutation({
    mutationFn: () => updateProfile({ name: currentName.trim() }),
    onSuccess: (updated) => {
      void queryClient.setQueryData(["me"], updated);
      setName(null);
    },
    onError: () => setError("프로필 업데이트에 실패했습니다."),
  });

  const pickFile = (file: File) => {
    if (!file.type.startsWith("image/")) { setError("이미지 파일만 업로드할 수 있습니다."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("파일 크기는 5MB 이하여야 합니다."); return; }
    setError(null);
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) pickFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) pickFile(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pendingFile) {
      await avatarMutation.mutateAsync(pendingFile);
      setPendingFile(null);
      setPreviewUrl(null);
    }
    if (name !== null && name.trim() !== me?.name) {
      profileMutation.mutate();
    }
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2500);
  };

  const isPending = avatarMutation.isPending || profileMutation.isPending;

  return (
    <form className={form} onSubmit={handleSubmit}>
      <div className={css.avatarSection}>
        <div className={css.avatarCircle}>
          {displayAvatar ? (
            <img src={displayAvatar} alt="프로필" className={css.avatarImg} />
          ) : (
            <span className={css.avatarInitial}>{initial}</span>
          )}
        </div>

        {pendingFile ? (
          <div className={css.fileSelected}>
            <span className={css.fileSelectedIcon}>✓</span>
            <span className={css.fileSelectedName}>{pendingFile.name}</span>
            <button
              type="button"
              className={css.fileClearBtn}
              onClick={() => { setPendingFile(null); setPreviewUrl(null); }}
            >
              ✕
            </button>
          </div>
        ) : (
          <div
            className={`${css.dropZone} ${isDragging ? css.dropZoneActive : ""}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <svg className={css.dropIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <span className={css.dropLabel}>드래그하거나 클릭해서 업로드</span>
            <span className={css.dropHint}>JPG, PNG, GIF · 최대 5MB</span>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </div>

      <Input
        id="profile-name"
        label="이름"
        value={currentName}
        onChange={(e) => setName(e.target.value)}
        required
      />

      {success && <p className={css.successMsg}>저장되었습니다.</p>}
      {error && <p className={css.errorMsg}>{error}</p>}

      <div className={footer}>
        <Button variant="secondary" size="md" type="button" onClick={onClose}>닫기</Button>
        <Button variant="primary" size="md" type="submit" disabled={isPending}>
          {isPending ? "저장 중..." : "저장"}
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
