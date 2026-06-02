import type { StateCreator } from "zustand";
import type { AiChatResponse, DiffChange } from "@erdify/contracts";
import type { DiagramDocument } from "@erdify/domain";
import { randomUUID } from "@/shared/utils/uuid";

export const DEFAULT_SESSION_ID = "default";

export interface AiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  diff: DiffChange[] | null;
  pendingDocument: DiagramDocument | null;
  accepted: boolean | null;
  isStreaming?: boolean;
}

export interface AiSession {
  id: string;
  name: string;
  createdAt: string;
}

export interface AiChatSlice {
  isOpen: boolean;
  isLoading: boolean;
  reviewingMessageId: string | null;
  currentSessionId: string | null;
  sessions: AiSession[];
  sessionMessages: Record<string, AiMessage[]>;
  currentDiagramId: string | null;
  streamingStatus: string | null;
  setStreamingStatus: (label: string | null) => void;
  openChat: (initialMessage?: string) => void;
  closeChat: () => void;
  addUserMessage: (content: string, sessionId?: string) => void;
  addAssistantMessage: (response: AiChatResponse, sessionId?: string) => void;
  acceptDiff: (messageId: string) => void;
  rejectDiff: (messageId: string) => void;
  setLoading: (loading: boolean) => void;
  openReview: (messageId: string) => void;
  closeReview: () => void;
  setCurrentSession: (sessionId: string) => void;
  setSessions: (sessions: AiSession[]) => void;
  addSession: (session: AiSession) => void;
  setCurrentDiagramId: (diagramId: string) => void;
  startStreamingMessage: (sessionId: string, tempId: string) => void;
  appendStreamingDelta: (sessionId: string, tempId: string, delta: string) => void;
  finalizeStreamingMessage: (
    sessionId: string,
    tempId: string,
    payload: { messageId: string; content?: string; diff: unknown[] | null; pendingDocument: unknown | null },
  ) => void;
}

export const createAiChatSlice: StateCreator<AiChatSlice> = (set) => ({
  isOpen: false,
  isLoading: false,
  reviewingMessageId: null,
  currentSessionId: null,
  sessions: [],
  sessionMessages: {},
  currentDiagramId: null,
  streamingStatus: null,

  setStreamingStatus: (label) => set({ streamingStatus: label }),

  openChat: (initialMessage) =>
    set((state) => {
      if (!initialMessage) return { isOpen: true };
      const sid = state.currentSessionId ?? DEFAULT_SESSION_ID;
      const existing = state.sessionMessages[sid] ?? [];
      return {
        isOpen: true,
        sessionMessages: {
          ...state.sessionMessages,
          [sid]: [...existing, { id: randomUUID(), role: "user", content: initialMessage, diff: null, pendingDocument: null, accepted: null }],
        },
      };
    }),

  closeChat: () => set({ isOpen: false }),

  addUserMessage: (content, sessionId) =>
    set((state) => {
      const sid = sessionId ?? DEFAULT_SESSION_ID;
      const existing = state.sessionMessages[sid] ?? [];
      const newMessage: AiMessage = { id: randomUUID(), role: "user", content, diff: null, pendingDocument: null, accepted: null };
      return {
        sessionMessages: { ...state.sessionMessages, [sid]: [...existing, newMessage] },
      };
    }),

  addAssistantMessage: (response, sessionId) =>
    set((state) => {
      const sid = sessionId ?? DEFAULT_SESSION_ID;
      const existing = state.sessionMessages[sid] ?? [];
      const newMessage: AiMessage = {
        id: response.messageId,
        role: "assistant",
        content: response.content,
        diff: response.diff,
        pendingDocument: response.pendingDocument,
        accepted: null,
      };
      return {
        sessionMessages: { ...state.sessionMessages, [sid]: [...existing, newMessage] },
      };
    }),

  acceptDiff: (messageId) =>
    set((state) => ({
      sessionMessages: Object.fromEntries(
        Object.entries(state.sessionMessages).map(([sid, msgs]) => [
          sid,
          msgs.map((m) => (m.id === messageId ? { ...m, accepted: true } : m)),
        ]),
      ),
    })),

  rejectDiff: (messageId) =>
    set((state) => ({
      sessionMessages: Object.fromEntries(
        Object.entries(state.sessionMessages).map(([sid, msgs]) => [
          sid,
          msgs.map((m) => (m.id === messageId ? { ...m, accepted: false } : m)),
        ]),
      ),
    })),

  setLoading: (loading) => set({ isLoading: loading }),
  openReview: (messageId) => set({ reviewingMessageId: messageId }),
  closeReview: () => set({ reviewingMessageId: null }),

  setCurrentSession: (sessionId) => set({ currentSessionId: sessionId }),

  setSessions: (sessions) => set({ sessions }),

  addSession: (session) =>
    set((state) => ({ sessions: [session, ...state.sessions] })),

  setCurrentDiagramId: (diagramId) =>
    set((state) => {
      if (state.currentDiagramId === diagramId) return {};
      return {
        currentDiagramId: diagramId,
        currentSessionId: null,
        sessionMessages: {},
      };
    }),

  startStreamingMessage: (sessionId, tempId) =>
    set((state) => {
      const streamingMessage: AiMessage = {
        id: tempId,
        role: "assistant",
        content: "",
        diff: null,
        pendingDocument: null,
        accepted: null,
        isStreaming: true,
      };
      const existing = state.sessionMessages[sessionId] ?? [];
      return {
        streamingStatus: null,
        sessionMessages: { ...state.sessionMessages, [sessionId]: [...existing, streamingMessage] },
      };
    }),

  appendStreamingDelta: (sessionId, tempId, delta) =>
    set((state) => {
      const existing = state.sessionMessages[sessionId] ?? [];
      return {
        sessionMessages: {
          ...state.sessionMessages,
          [sessionId]: existing.map((m) =>
            m.id === tempId ? { ...m, content: m.content + delta } : m
          ),
        },
      };
    }),

  finalizeStreamingMessage: (sessionId, tempId, payload) =>
    set((state) => {
      const existing = state.sessionMessages[sessionId] ?? [];
      return {
        streamingStatus: null,
        sessionMessages: {
          ...state.sessionMessages,
          [sessionId]: existing.map((m) =>
            m.id === tempId
              ? {
                  ...m,
                  id: payload.messageId,
                  content: payload.content ?? m.content,
                  diff: payload.diff as DiffChange[] | null,
                  pendingDocument: payload.pendingDocument as DiagramDocument | null,
                  isStreaming: false,
                }
              : m
          ),
        },
      };
    }),
});
