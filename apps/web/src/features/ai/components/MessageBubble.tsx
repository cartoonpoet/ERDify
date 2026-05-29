import type { AiMessage } from "../store/aiChatSlice";
import { DiffCard } from "./DiffCard";
import * as css from "./MessageBubble.css";

interface MessageBubbleProps {
  message: AiMessage;
  onOpenReview: (messageId: string) => void;
}

export const MessageBubble = ({ message, onOpenReview }: MessageBubbleProps) => {
  const isUser = message.role === "user";

  return (
    <div className={isUser ? css.wrapperUser : css.wrapperAssistant}>
      <div className={isUser ? css.bubbleUser : css.bubbleAssistant}>
        {message.content}
        {message.isStreaming && <span className={css.streamingCursor}>▊</span>}
      </div>
      {message.diff && (
        <div className={css.diffArea}>
          <DiffCard
            messageId={message.id}
            diff={message.diff}
            accepted={message.accepted}
            onOpenReview={onOpenReview}
          />
        </div>
      )}
    </div>
  );
};
