import type { StateCreator } from "zustand";
import type { AiChatResponse, DiffChange } from "@erdify/contracts";
import type { DiagramDocument } from "@erdify/domain";

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
  openChat: (initialMessage?: string) => void;
  closeChat: () => void;
  addUserMessage: (content: string) => void;
  addAssistantMessage: (response: AiChatResponse) => void;
  acceptDiff: (messageId: string) => void;
  rejectDiff: (messageId: string) => void;
  setLoading: (loading: boolean) => void;
}

export const createAiChatSlice: StateCreator<AiChatSlice> = (set) => ({
  isOpen: false,
  messages: [],
  isLoading: false,

  openChat: (initialMessage) =>
    set((state) => ({
      isOpen: true,
      messages: initialMessage
        ? [...state.messages, { id: crypto.randomUUID(), role: "user", content: initialMessage, diff: null, pendingDocument: null, accepted: null }]
        : state.messages,
    })),

  closeChat: () => set({ isOpen: false }),

  addUserMessage: (content) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { id: crypto.randomUUID(), role: "user", content, diff: null, pendingDocument: null, accepted: null },
      ],
    })),

  addAssistantMessage: (response) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: response.messageId,
          role: "assistant",
          content: response.content,
          diff: response.diff,
          pendingDocument: response.pendingDocument,
          accepted: null,
        },
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
});
