import { useState } from "react";
import type { AnnouncementResponse, CreateAnnouncementDto, AnnouncementType, AiAnnouncementResult } from "@erdify/contracts";
import { Modal } from "@/shared/components/Modal";
import { Button } from "@/shared/components/Button";
import { Input } from "@/shared/components/Input";
import { AnnouncementAiPanel } from "./AnnouncementAiPanel";
import { vars } from "@/style/tokens.css";

interface AnnouncementFormProps {
  open: boolean;
  initial?: AnnouncementResponse | undefined;
  onClose: () => void;
  onSubmit: (dto: CreateAnnouncementDto) => Promise<void>;
}

const TYPE_OPTIONS: { value: AnnouncementType; label: string }[] = [
  { value: "maintenance", label: "🛠️ 점검 안내" },
  { value: "error", label: "🔴 오류 공지" },
  { value: "feature", label: "✨ 신규 기능" },
  { value: "general", label: "📢 일반 공지" },
];

export const AnnouncementForm = ({ open, initial, onClose, onSubmit }: AnnouncementFormProps) => {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [type, setType] = useState<AnnouncementType>(initial?.type ?? "general");
  const [isUrgent, setIsUrgent] = useState(initial?.isUrgent ?? false);
  const [startsAt, setStartsAt] = useState(
    initial?.startsAt ? new Date(initial.startsAt).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)
  );
  const [endsAt, setEndsAt] = useState(
    initial?.endsAt ? new Date(initial.endsAt).toISOString().slice(0, 16) : ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleApplyAi = (result: AiAnnouncementResult) => {
    setTitle(result.title);
    setContent(result.content);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) { setError("제목과 내용을 입력해주세요."); return; }
    setLoading(true);
    setError("");
    try {
      await onSubmit({
        title: title.trim(),
        content: content.trim(),
        type,
        isUrgent,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      });
      onClose();
    } catch {
      setError("저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const selectStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px",
    border: `1px solid ${vars.color.border}`, borderRadius: vars.radius.md,
    fontSize: "13px", fontFamily: vars.font.family, background: vars.color.surfaceTertiary,
    color: vars.color.textPrimary, outline: "none",
  };

  const textareaStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px", minHeight: "100px",
    border: `1px solid ${vars.color.border}`, borderRadius: vars.radius.md,
    fontSize: "13px", fontFamily: vars.font.family, resize: "vertical", outline: "none",
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? "공지 수정" : "새 공지 작성"} maxWidth="520px">
      <AnnouncementAiPanel
        type={type}
        currentTitle={title}
        currentContent={content}
        onApply={handleApplyAi}
      />
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
        <div>
          <label style={{ fontSize: "12px", fontWeight: 600, color: vars.color.textSecondary, display: "block", marginBottom: "4px" }}>타입</label>
          <select style={selectStyle} value={type} onChange={(e) => setType(e.target.value as AnnouncementType)}>
            {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <Input label="제목" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="공지 제목" required />
        <div>
          <label style={{ fontSize: "12px", fontWeight: 600, color: vars.color.textSecondary, display: "block", marginBottom: "4px" }}>내용</label>
          <textarea style={textareaStyle} value={content} onChange={(e) => setContent(e.target.value)} placeholder="공지 내용을 입력하세요" required />
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: vars.color.textSecondary, display: "block", marginBottom: "4px" }}>시작 일시</label>
            <input type="datetime-local" style={{ ...selectStyle }} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: vars.color.textSecondary, display: "block", marginBottom: "4px" }}>종료 일시 (선택)</label>
            <input type="datetime-local" style={{ ...selectStyle }} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: vars.color.textPrimary, cursor: "pointer" }}>
          <input type="checkbox" checked={isUrgent} onChange={(e) => setIsUrgent(e.target.checked)} />
          긴급 공지 (사용자가 반드시 확인해야 함, "다시 보지 않기" 비활성)
        </label>
        {error && <div style={{ fontSize: "12px", color: vars.color.error }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <Button variant="secondary" size="md" onClick={onClose} type="button">취소</Button>
          <Button variant="primary" size="md" type="submit" disabled={loading}>{loading ? "저장 중..." : "저장"}</Button>
        </div>
      </form>
    </Modal>
  );
};
