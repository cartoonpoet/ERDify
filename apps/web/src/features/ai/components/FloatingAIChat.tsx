import { randomUUID } from "@/shared/utils/uuid";
import { useAIChatStore } from "../store/useAIChatStore";
import { AIChatFAB } from "./AIChatFAB";
import { AIChatWindow } from "./AIChatWindow";
import { sendAiChat, acceptAiDiff, rejectAiDiff } from "../api/ai.api";
import { useEditorStore } from "@/features/editor/store/useEditorStore";

interface FloatingAIChatProps {
  diagramId: string;
}

export const FloatingAIChat = ({ diagramId }: FloatingAIChatProps) => {
  const { isOpen, messages, isLoading, openChat, closeChat, addUserMessage, addAssistantMessage, acceptDiff, rejectDiff, setLoading } = useAIChatStore();

  const handleSend = async (message: string) => {
    addUserMessage(message);
    setLoading(true);
    try {
      const response = await sendAiChat(diagramId, message);
      addAssistantMessage(response);
    } catch {
      addAssistantMessage({ messageId: randomUUID(), content: "오류가 발생했습니다. 다시 시도해주세요.", diff: null, pendingDocument: null });
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg?.pendingDocument) return;
    acceptDiff(messageId);
    await acceptAiDiff(messageId).catch(() => {});
    useEditorStore.getState().setDocument(msg.pendingDocument);
  };

  const handleReject = async (messageId: string) => {
    rejectDiff(messageId);
    await rejectAiDiff(messageId).catch(() => {});
  };

  return (
    <>
      {!isOpen && <AIChatFAB onClick={() => openChat()} />}
      {isOpen && (
        <AIChatWindow
          messages={messages}
          isLoading={isLoading}
          onClose={closeChat}
          onSend={handleSend}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      )}
    </>
  );
};
