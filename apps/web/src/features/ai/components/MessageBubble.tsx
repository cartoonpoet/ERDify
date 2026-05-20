import type { AiMessage } from "../store/aiChatSlice";
import { DiffCard } from "./DiffCard";

interface MessageBubbleProps {
  message: AiMessage;
  onAccept: (messageId: string) => void;
  onReject: (messageId: string) => void;
}

export const MessageBubble = ({ message, onAccept, onReject }: MessageBubbleProps) => {
  const isUser = message.role === "user";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start", marginBottom: 12 }}>
      <div
        style={{
          maxWidth: "80%",
          padding: "8px 12px",
          borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
          background: isUser ? "#2563eb" : "#f1f5f9",
          color: isUser ? "#fff" : "#1e293b",
          fontSize: 14,
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {message.content}
      </div>
      {message.diff && (
        <div style={{ width: "80%", marginTop: 4 }}>
          <DiffCard
            messageId={message.id}
            diff={message.diff}
            accepted={message.accepted}
            onAccept={onAccept}
            onReject={onReject}
          />
        </div>
      )}
    </div>
  );
};
