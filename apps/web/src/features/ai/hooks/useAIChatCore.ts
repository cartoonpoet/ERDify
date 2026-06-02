import { randomUUID } from "@/shared/utils/uuid";
import { useState, useRef, useEffect } from "react";
import type React from "react";
import { useAIChatStore } from "../store/useAIChatStore";
import { DEFAULT_SESSION_ID } from "../store/aiChatSlice";
import { acceptAiDiff, rejectAiDiff, sendAiChatStream, createSession, getSessionMessages } from "../api/ai.api";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import type { AiMessage } from "../store/aiChatSlice";

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
  isSessionLoading: boolean;
}

export const useAIChatCore = (diagramId: string, selectedModel: string): UseAIChatCoreReturn => {
  const {
    isLoading,
    isSessionLoading,
    reviewingMessageId, closeReview,
    addUserMessage,
    acceptDiff, rejectDiff,
    currentSessionId, sessionMessages,
    setSessions,
    setCurrentSession, addSession,
    setStreamingStatus,
    startStreamingMessage, appendStreamingDelta, finalizeStreamingMessage,
    setSessionMessages, setIsSessionLoading,
  } = useAIChatStore();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessionMessages]);

  const currentMessages = sessionMessages[currentSessionId ?? DEFAULT_SESSION_ID] ?? [];

  const buildStreamingCallbacks = (sessionId: string, tempId: string) => ({
    onText: (delta: string) => appendStreamingDelta(sessionId, tempId, delta),
    onDone: (result: { messageId: string; diff: unknown[] | null; pendingDocument: unknown | null }) =>
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

    const isFirstMessage = (sessionMessages[sessionId] ?? []).length === 0;

    addUserMessage(message, sessionId);

    const tempId = randomUUID();
    startStreamingMessage(sessionId, tempId);

    const { onText, onDone, onError } = buildStreamingCallbacks(sessionId, tempId);

    try {
      await sendAiChatStream(diagramId, message, sessionId, selectedModel, onText, onDone, onError, setStreamingStatus);
    } catch {
      finalizeStreamingMessage(sessionId, tempId, {
        messageId: randomUUID(),
        content: "오류가 발생했습니다. 다시 시도해주세요.",
        diff: null,
        pendingDocument: null,
      });
    }

    if (isFirstMessage) {
      const newName = message.slice(0, 30);
      const updatedSessions = useAIChatStore.getState().sessions.map((s) =>
        s.id === sessionId ? { ...s, name: newName } : s
      );
      setSessions(updatedSessions);
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

    if (sessionId === DEFAULT_SESSION_ID) return;
    if (sessionMessages[sessionId] !== undefined) return;

    setIsSessionLoading(true);
    try {
      const items = await getSessionMessages(sessionId);
      const messages: AiMessage[] = items.map((item) => ({
        id: item.id,
        role: item.role,
        content: item.content,
        diff: item.diff,
        accepted: item.accepted,
        pendingDocument: null,
      }));
      setSessionMessages(sessionId, messages);
    } catch {
      setSessionMessages(sessionId, [
        {
          id: randomUUID(),
          role: "assistant",
          content: "대화를 불러오지 못했습니다. 다시 시도해주세요.",
          diff: null,
          accepted: null,
          pendingDocument: null,
        },
      ]);
    } finally {
      setIsSessionLoading(false);
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

  const sendBtnDisabled = isLoading || !input.trim();

  const reviewingMessage = reviewingMessageId
    ? currentMessages.find((m) => m.id === reviewingMessageId)
    : null;

  const currentDocument = useEditorStore.getState().document;

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
    isSessionLoading,
  };
};
