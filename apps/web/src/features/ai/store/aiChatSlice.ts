import type { StateCreator } from "zustand";
import type { DiffChange } from "@erdify/contracts";
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
  messages: AiMessage[];
  isLoading: boolean;
  reviewingMessageId: string | null;
  enableReadTools: boolean;
  streamingStatus: string | null;
  streamingText: string;
  openChat: (initialMessage?: string) => void;
  closeChat: () => void;
  addUserMessage: (content: string) => void;
  acceptDiff: (messageId: string) => void;
  rejectDiff: (messageId: string) => void;
  setLoading: (loading: boolean) => void;
  openReview: (messageId: string) => void;
  closeReview: () => void;
  setEnableReadTools: (v: boolean) => void;
  startAssistantStream: () => void;
  appendStreamText: (delta: string) => void;
  setStreamStatus: (label: string) => void;
  finishAssistantStream: (msg: { messageId: string; content: string; diff: DiffChange[] | null; pendingDocument: DiagramDocument | null }) => void;
  failAssistantStream: (message: string) => void;
}

export const createAiChatSlice: StateCreator<AiChatSlice> = (set) => ({
  isOpen: false,
  messages: [],
  isLoading: false,
  reviewingMessageId: null,
  enableReadTools: false,
  streamingStatus: null,
  streamingText: "",

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

  setEnableReadTools: (v) => set({ enableReadTools: v }),
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
