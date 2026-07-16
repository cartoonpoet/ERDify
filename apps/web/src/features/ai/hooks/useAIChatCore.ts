import { randomUUID } from "@/shared/utils/uuid";
import { useState, useRef, useEffect } from "react";
import type React from "react";
import { useAIChatStore } from "../store/useAIChatStore";
import { DEFAULT_SESSION_ID } from "../store/aiChatSlice";
import { acceptAiDiff, rejectAiDiff, sendAiChatStream, createSession, getSessionMessages } from "../api/ai.api";
import type { AiChatStreamDoneResult } from "../api/ai.api";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import type { AiMessage } from "../store/aiChatSlice";
import { mapToAiMessages } from "../ai-chat-utils";

interface UseAIChatCoreReturn {
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  currentMessages: AiMessage[];
  sendBtnDisabled: boolean;
  reviewingMessage: AiMessage | null | undefined;
  currentDocument: ReturnType<typeof useEditorStore.getState>["document"];
  handleSendInput: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleAccept: (messageId: string) => Promise<void>;
  handleReject: (messageId: string) => Promise<void>;
  handleSelectSession: (sessionId: string) => Promise<void>;
  handleNewSession: () => Promise<void>;
  handleLoadMore: () => Promise<void>;
  canLoadMore: boolean;
  isLoadingHistory: boolean;
}

export const useAIChatCore = (diagramId: string, selectedModel: string): UseAIChatCoreReturn => {
  const {
    isLoading,
    reviewingMessageId, closeReview,
    addUserMessage,
    acceptDiff, rejectDiff,
    currentSessionId, sessionMessages,
    setCurrentSession, addSession,
    setStreamingStatus,
    startStreamingMessage, appendStreamingDelta, finalizeStreamingMessage,
    sessionHasMore, sessionHistoryLoading,
    setSessionMessages, prependSessionMessages, setSessionHistoryLoading,
  } = useAIChatStore();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const lastMessageIdRef = useRef<string | null>(null);

  const currentMessages = sessionMessages[currentSessionId ?? DEFAULT_SESSION_ID] ?? [];

  useEffect(() => {
    const lastId = currentMessages.at(-1)?.id ?? null;
    if (lastId && lastId !== lastMessageIdRef.current) {
      lastMessageIdRef.current = lastId;
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentMessages]);

  const buildStreamingCallbacks = (sessionId: string, tempId: string) => ({
    onText: (delta: string) => appendStreamingDelta(sessionId, tempId, delta),
    onDone: (result: AiChatStreamDoneResult) =>
      finalizeStreamingMessage(sessionId, tempId, result),
    onError: (errorMsg: string) =>
      finalizeStreamingMessage(sessionId, tempId, {
        messageId: randomUUID(),
        content: `오류가 발생했습니다: ${errorMsg}`,
        diff: null,
        pendingDocument: null,
      }),
  });

  const handleSend = async (message: string) => {
    let sessionId = currentSessionId;

    if (!sessionId) {
      try {
        const { sessionId: newSessionId } = await createSession(diagramId);
        const newSession = {
          id: newSessionId,
          name: "새 대화",
          createdAt: new Date().toISOString(),
        };
        addSession(newSession);
        setCurrentSession(newSessionId);
        sessionId = newSessionId;
      } catch {
        // 세션 생성 실패 시 default 세션으로 폴백
        sessionId = DEFAULT_SESSION_ID;
      }
    }

    addUserMessage(message, sessionId);

    const tempId = randomUUID();
    startStreamingMessage(sessionId, tempId);

    const { onText, onDone, onError } = buildStreamingCallbacks(sessionId, tempId);

    try {
      await sendAiChatStream({
        diagramId,
        message,
        sessionId,
        model: selectedModel,
        onText,
        onDone,
        onError,
        onStatus: setStreamingStatus,
      });
    } catch {
      finalizeStreamingMessage(sessionId, tempId, {
        messageId: randomUUID(),
        content: "오류가 발생했습니다. 다시 시도해주세요.",
        diff: null,
        pendingDocument: null,
      });
    }
  };

  const handleSendInput = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    handleSend(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSendInput();
    }
  };

  const handleAccept = async (messageId: string) => {
    const msg = currentMessages.find((m) => m.id === messageId);
    if (!msg?.pendingDocument) return;
    acceptDiff(messageId);
    closeReview();
    await acceptAiDiff(messageId).catch(() => {});
    useEditorStore.getState().setDocument(msg.pendingDocument);
  };

  const handleReject = async (messageId: string) => {
    rejectDiff(messageId);
    closeReview();
    await rejectAiDiff(messageId).catch(() => {});
  };

  const handleSelectSession = async (sessionId: string) => {
    setCurrentSession(sessionId);
    if (sessionMessages[sessionId]) return;
    setSessionHistoryLoading(sessionId, true);
    try {
      const { messages, hasMore } = await getSessionMessages(sessionId);
      setSessionMessages(sessionId, mapToAiMessages(messages), hasMore);
    } catch {
      // 실패 시 빈 메시지 유지
    } finally {
      setSessionHistoryLoading(sessionId, false);
    }
  };

  const handleNewSession = async () => {
    try {
      const { sessionId } = await createSession(diagramId);
      const newSession = {
        id: sessionId,
        name: "새 대화",
        createdAt: new Date().toISOString(),
      };
      addSession(newSession);
      setCurrentSession(sessionId);
    } catch {
      // 세션 생성 실패 시 무시
    }
  };

  const handleLoadMore = async () => {
    const sessionId = currentSessionId;
    if (!sessionId) return;
    if (!sessionHasMore[sessionId]) return;
    if (sessionHistoryLoading[sessionId]) return;

    const oldest = currentMessages[0];
    if (!oldest) return;

    setSessionHistoryLoading(sessionId, true);
    try {
      const { messages, hasMore } = await getSessionMessages(sessionId, { before: oldest.id });
      prependSessionMessages(sessionId, mapToAiMessages(messages), hasMore);
    } catch {
      // 실패 시 무시
    } finally {
      setSessionHistoryLoading(sessionId, false);
    }
  };

  const sendBtnDisabled = isLoading || !input.trim();

  const reviewingMessage = reviewingMessageId
    ? currentMessages.find((m) => m.id === reviewingMessageId)
    : null;

  const currentDocument = useEditorStore.getState().document;

  const canLoadMore = !!currentSessionId && !!sessionHasMore[currentSessionId];
  const isLoadingHistory = !!currentSessionId && !!sessionHistoryLoading[currentSessionId];

  return {
    input,
    setInput,
    bottomRef,
    currentMessages,
    sendBtnDisabled,
    reviewingMessage,
    currentDocument,
    handleSendInput,
    handleKeyDown,
    handleAccept,
    handleReject,
    handleSelectSession,
    handleNewSession,
    handleLoadMore,
    canLoadMore,
    isLoadingHistory,
  };
};
