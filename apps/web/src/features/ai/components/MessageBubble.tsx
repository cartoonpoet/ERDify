import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
        {isUser ? (
          message.content
        ) : (
          <div className={css.markdown}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        )}
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
