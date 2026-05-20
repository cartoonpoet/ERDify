import { create } from "zustand";
import { createAiChatSlice } from "./aiChatSlice";
import type { AiChatSlice } from "./aiChatSlice";

export const useAIChatStore = create<AiChatSlice>()((...a) => ({
  ...createAiChatSlice(...a),
}));
