import type { StateCreator } from "zustand";
import type { DiffChange, AiChatHistoryMessage } from "@erdify/contracts";
import type { DiagramDocument } from "@erdify/domain";
import { randomUUID } from "@/shared/utils/uuid";

export interface AiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  diff: DiffChange[] | null;
  pendingDocument: DiagramDocument | null;
  accepted: boolean | null;
}

export interface AiChatSlice {
  isOpen: boolean;
  diagramId: string | null;
  messages: AiMessage[];
  isLoading: boolean;
  reviewingMessageId: string | null;
  streamingStatus: string | null;
  streamingText: string;
  resetForDiagram: (diagramId: string) => void;
  loadHistory: (diagramId: string, messages: AiChatHistoryMessage[]) => void;
  openChat: (initialMessage?: string) => void;
  closeChat: () => void;
  addUserMessage: (content: string) => void;
  acceptDiff: (messageId: string) => void;
  rejectDiff: (messageId: string) => void;
  setLoading: (loading: boolean) => void;
  openReview: (messageId: string) => void;
  closeReview: () => void;
  startAssistantStream: () => void;
  appendStreamText: (delta: string) => void;
  setStreamStatus: (label: string) => void;
  finishAssistantStream: (msg: { messageId: string; content: string; diff: DiffChange[] | null; pendingDocument: DiagramDocument | null }) => void;
  failAssistantStream: (message: string) => void;
}

export const createAiChatSlice: StateCreator<AiChatSlice> = (set) => ({
  isOpen: false,
  diagramId: null,
  messages: [],
  isLoading: false,
  reviewingMessageId: null,
  streamingStatus: null,
  streamingText: "",

  resetForDiagram: (diagramId) =>
    set({ diagramId, messages: [], isLoading: false, reviewingMessageId: null, streamingStatus: null, streamingText: "" }),

  loadHistory: (diagramId, history) =>
    set((state) => {
      // 전환·전송 레이스 방지: 여전히 같은 다이어그램이고 메시지가 비어있을 때만 복원
      if (state.diagramId !== diagramId || state.messages.length > 0) return {};
      return {
        messages: history.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          diff: m.diff,
          pendingDocument: null,
          accepted: m.accepted,
        })),
      };
    }),

  openChat: (initialMessage) =>
    set((state) => ({
      isOpen: true,
      messages: initialMessage
        ? [...state.messages, { id: randomUUID(), role: "user", content: initialMessage, diff: null, pendingDocument: null, accepted: null }]
        : state.messages,
    })),

  closeChat: () => set({ isOpen: false }),

  addUserMessage: (content) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { id: randomUUID(), role: "user", content, diff: null, pendingDocument: null, accepted: null },
      ],
    })),

  acceptDiff: (messageId) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, accepted: true } : m
      ),
    })),

  rejectDiff: (messageId) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, accepted: false } : m
      ),
    })),

  setLoading: (loading) => set({ isLoading: loading }),
  openReview: (messageId) => set({ reviewingMessageId: messageId }),
  closeReview: () => set({ reviewingMessageId: null }),

  startAssistantStream: () => set({ isLoading: true, streamingStatus: null, streamingText: "" }),
  appendStreamText: (delta) => set((state) => ({ streamingText: state.streamingText + delta })),
  setStreamStatus: (label) => set({ streamingStatus: label }),
  finishAssistantStream: (msg) =>
    set((state) => ({
      isLoading: false,
      streamingStatus: null,
      streamingText: "",
      messages: [
        ...state.messages,
        { id: msg.messageId, role: "assistant", content: msg.content, diff: msg.diff, pendingDocument: msg.pendingDocument, accepted: null },
      ],
    })),
  failAssistantStream: (message) =>
    set((state) => ({
      isLoading: false,
      streamingStatus: null,
      streamingText: "",
      messages: [
        ...state.messages,
        { id: randomUUID(), role: "assistant", content: message, diff: null, pendingDocument: null, accepted: null },
      ],
    })),
});
