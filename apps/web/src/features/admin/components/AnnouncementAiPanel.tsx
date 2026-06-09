import { useState } from "react";
import { vars } from "@/style/tokens.css";
import type { AnnouncementType, AiAnnouncementResult } from "@erdify/contracts";
import { adminAiGenerate, adminAiRefine } from "@/shared/api/admin-announcements.api";

const panelStyle: React.CSSProperties = {
  background: vars.color.selectedBg,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  padding: "12px 16px",
  display: "flex", flexDirection: "column", gap: "10px",
};
const rowStyle: React.CSSProperties = { display: "flex", gap: "8px" };
const inputStyle: React.CSSProperties = {
  flex: 1, padding: "7px 10px", borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.border}`, fontSize: "13px",
  fontFamily: vars.font.family, outline: "none",
};
const btnStyle: React.CSSProperties = {
  padding: "7px 14px", borderRadius: vars.radius.pill,
  background: vars.color.primary, color: "#fff", border: "none",
  fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: vars.font.family,
};
const refineBtnStyle: React.CSSProperties = { ...btnStyle, background: "transparent", color: vars.color.primary, border: `1px solid ${vars.color.primary}` };
const labelStyle: React.CSSProperties = { fontSize: "11px", fontWeight: 600, color: vars.color.primary };

interface AnnouncementAiPanelProps {
  type: AnnouncementType;
  currentTitle: string;
  currentContent: string;
  onApply: (result: AiAnnouncementResult) => void;
}

export const AnnouncementAiPanel = ({ type, currentTitle, currentContent, onApply }: AnnouncementAiPanelProps) => {
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<AiAnnouncementResult | null>(null);

  const handleGenerate = async () => {
    if (!keywords.trim()) return;
    setLoading(true);
    try {
      const result = await adminAiGenerate({ type, keywords });
      setPreview(result);
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = async () => {
    if (!currentTitle && !currentContent) return;
    setLoading(true);
    try {
      const result = await adminAiRefine({ title: currentTitle, content: currentContent });
      setPreview(result);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPreview = () => { onApply(preview!); setPreview(null); };

  return (
    <div style={panelStyle}>
      <span style={labelStyle}>✨ AI 작성 보조</span>
      <div style={rowStyle}>
        <input
          style={inputStyle}
          placeholder="핵심 내용을 입력하세요 (예: 5/29 새벽 2-4시 DB 점검)"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          disabled={loading}
        />
        <button style={btnStyle} onClick={handleGenerate} disabled={loading || !keywords.trim()}>
          {loading ? "생성 중..." : "AI로 작성"}
        </button>
        <button style={refineBtnStyle} onClick={handleRefine} disabled={loading || (!currentTitle && !currentContent)}>
          AI로 다듬기
        </button>
      </div>
      {preview && (
        <div style={{ background: vars.color.surface, borderRadius: vars.radius.md, padding: "10px 12px", display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: vars.color.textPrimary }}>{preview.title}</div>
          <div style={{ fontSize: "12px", color: vars.color.textSecondary, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{preview.content}</div>
          <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
            <button style={btnStyle} onClick={handleApplyPreview}>적용</button>
            <button style={{ ...btnStyle, background: "transparent", color: vars.color.textSecondary, border: `1px solid ${vars.color.border}` }} onClick={() => setPreview(null)}>취소</button>
          </div>
        </div>
      )}
    </div>
  );
};
