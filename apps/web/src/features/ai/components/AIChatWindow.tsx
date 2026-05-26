import { useRef, useEffect, useState } from "react";
import type { AiMessage } from "../store/aiChatSlice";
import { MessageBubble } from "./MessageBubble";

interface AIChatWindowProps {
  messages: AiMessage[];
  isLoading: boolean;
  onClose: () => void;
  onSend: (message: string) => void;
  onOpenReview: (messageId: string) => void;
}

export const AIChatWindow = ({ messages, isLoading, onClose, onSend, onOpenReview }: AIChatWindowProps) => {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 88,
        right: 24,
        width: 360,
        height: 480,
        borderRadius: 16,
        background: "#ffffff",
        boxShadow: "0 8px 32px rgba(0,0,0,0.16)",
        display: "flex",
        flexDirection: "column",
        zIndex: 1000,
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "12px 16px", background: "#2563eb", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 600, fontSize: 15 }}>✦ ERDify AI</span>
        <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 12px" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 14, marginTop: 40 }}>
            ERD에 대해 무엇이든 물어보세요.<br />
            <span style={{ fontSize: 12 }}>"orders 테이블 추가해줘" 같은 명령도 가능해요.</span>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onOpenReview={onOpenReview} />
        ))}
        {isLoading && (
          <div style={{ color: "#94a3b8", fontSize: 13, padding: "4px 0" }}>AI가 생각 중...</div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: "8px 12px", borderTop: "1px solid #e2e8f0", display: "flex", gap: 8, alignItems: "flex-end" }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지 입력 (Enter 전송, Shift+Enter 줄바꿈)"
          rows={2}
          style={{ flex: 1, resize: "none", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 10px", fontSize: 13, outline: "none", fontFamily: "inherit" }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          style={{ padding: "8px 14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500, opacity: isLoading || !input.trim() ? 0.5 : 1 }}
        >
          전송
        </button>
      </div>
    </div>
  );
};
