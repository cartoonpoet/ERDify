import { useRef, useState, type FormEvent, type ChangeEvent, type DragEvent } from "react";
import { Button, Input } from "@/components";
import { getMe, updateProfile, uploadAvatar } from "@/shared/api/auth.api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { form, footer } from "./modal-form.css";
import * as css from "./ProfileModal.css";

const resolveUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  return path;
};

interface ProfileTabProps {
  onClose: () => void;
}

export const ProfileTab = ({ onClose }: ProfileTabProps) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });

  const [name, setName] = useState<string>(() => {
    const cached = queryClient.getQueryData<Awaited<ReturnType<typeof getMe>>>(["me"]);
    return cached?.name ?? "";
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayAvatar = previewUrl ?? resolveUrl(me?.avatarUrl);
  const initial = (me?.name?.[0] ?? me?.email?.[0] ?? "?").toUpperCase();

  const avatarMutation = useMutation({ mutationFn: (file: File) => uploadAvatar(file) });
  const profileMutation = useMutation({ mutationFn: (n: string) => updateProfile({ name: n }) });

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
    setSuccess(false);
    try {
      if (pendingFile) {
        const updated = await avatarMutation.mutateAsync(pendingFile);
        queryClient.setQueryData(["me"], updated);
        setPendingFile(null);
        setPreviewUrl(null);
      }
      if (name.trim() !== me?.name) {
        const updated = await profileMutation.mutateAsync(name.trim());
        queryClient.setQueryData(["me"], updated);
        setName(updated.name);
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch {
      setError("저장에 실패했습니다. 다시 시도해 주세요.");
    }
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
        value={name}
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
