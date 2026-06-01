import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useAIModelSelection } from "./useAIModelSelection";
import { getAiChatConfig, getSessions } from "../api/ai.api";
import { useAIChatStore } from "../store/useAIChatStore";
import type { AiModelOption } from "../models";

vi.mock("../api/ai.api", () => ({
  getAiChatConfig: vi.fn(),
  getSessions: vi.fn(),
}));

const MODEL_STORAGE_KEY = "erdify.ai.model";

const makeModel = (value: string, label: string): AiModelOption => ({
  provider: "anthropic",
  value,
  label,
});

const MODEL_A = makeModel("claude-sonnet-4-6", "Claude Sonnet 4.6");
const MODEL_B = makeModel("claude-opus-4-6", "Claude Opus 4.6");

const initialStoreState = {
  currentDiagramId: null as string | null,
  sessions: [] as { id: string; name: string; createdAt: string }[],
};

beforeEach(() => {
  localStorage.clear();
  useAIChatStore.setState(initialStoreState);
  vi.mocked(getSessions).mockResolvedValue([]);
  vi.mocked(getAiChatConfig).mockResolvedValue({ models: [MODEL_A, MODEL_B] });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useAIModelSelection — 초기 마운트 시 모델 목록 로드", () => {
  it("getAiChatConfig를 diagramId로 호출하고 models를 채운다", async () => {
    const { result } = renderHook(() => useAIModelSelection("diag-1"));

    await waitFor(() => expect(result.current.models).toHaveLength(2));

    expect(getAiChatConfig).toHaveBeenCalledWith("diag-1");
    expect(result.current.models).toEqual([MODEL_A, MODEL_B]);
  });

  it("getSessions를 diagramId로 호출한다", async () => {
    renderHook(() => useAIModelSelection("diag-1"));

    await waitFor(() => expect(getSessions).toHaveBeenCalledWith("diag-1"));
  });

  it("초기 selectedModel은 모델 목록 첫 번째 value이다 (localStorage 미설정)", async () => {
    const { result } = renderHook(() => useAIModelSelection("diag-1"));

    await waitFor(() => expect(result.current.selectedModel).toBe(MODEL_A.value));
  });

  it("getAiChatConfig 실패 시 models는 빈 배열을 유지한다", async () => {
    vi.mocked(getAiChatConfig).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAIModelSelection("diag-err"));

    // 에러는 무시되고 초기 빈 배열 유지
    await waitFor(() => expect(getAiChatConfig).toHaveBeenCalled());
    expect(result.current.models).toHaveLength(0);
  });
});

describe("useAIModelSelection — localStorage에서 선택된 모델 복원", () => {
  it("localStorage에 유효한 모델 value가 있으면 해당 모델로 selectedModel을 초기화한다", async () => {
    localStorage.setItem(MODEL_STORAGE_KEY, MODEL_B.value);

    const { result } = renderHook(() => useAIModelSelection("diag-1"));

    await waitFor(() => expect(result.current.selectedModel).toBe(MODEL_B.value));
  });

  it("localStorage에 유효하지 않은 value가 있으면 첫 번째 모델로 fallback한다", async () => {
    localStorage.setItem(MODEL_STORAGE_KEY, "invalid-model-value");

    const { result } = renderHook(() => useAIModelSelection("diag-1"));

    await waitFor(() => expect(result.current.selectedModel).toBe(MODEL_A.value));
  });

  it("localStorage가 비어있으면 첫 번째 모델을 선택한다", async () => {
    const { result } = renderHook(() => useAIModelSelection("diag-1"));

    await waitFor(() => expect(result.current.selectedModel).toBe(MODEL_A.value));
  });
});

describe("useAIModelSelection — handleModelSelect", () => {
  it("handleModelSelect 호출 시 selectedModel 상태를 변경한다", async () => {
    const { result } = renderHook(() => useAIModelSelection("diag-1"));
    await waitFor(() => expect(result.current.selectedModel).toBe(MODEL_A.value));

    act(() => {
      result.current.handleModelSelect(MODEL_B.value);
    });

    expect(result.current.selectedModel).toBe(MODEL_B.value);
  });

  it("handleModelSelect 호출 시 선택된 value를 localStorage에 저장한다", async () => {
    const { result } = renderHook(() => useAIModelSelection("diag-1"));
    await waitFor(() => expect(result.current.models).toHaveLength(2));

    act(() => {
      result.current.handleModelSelect(MODEL_B.value);
    });

    expect(localStorage.getItem(MODEL_STORAGE_KEY)).toBe(MODEL_B.value);
  });
});

describe("useAIModelSelection — diagramId 변경 시 재로드", () => {
  it("diagramId가 변경되면 getAiChatConfig를 새 diagramId로 다시 호출한다", async () => {
    vi.mocked(getAiChatConfig)
      .mockResolvedValueOnce({ models: [MODEL_A] })
      .mockResolvedValueOnce({ models: [MODEL_B] });

    const { result, rerender } = renderHook(
      ({ diagramId }: { diagramId: string }) => useAIModelSelection(diagramId),
      { initialProps: { diagramId: "diag-1" } },
    );

    await waitFor(() => expect(result.current.models).toEqual([MODEL_A]));

    rerender({ diagramId: "diag-2" });

    await waitFor(() => expect(result.current.models).toEqual([MODEL_B]));
    expect(getAiChatConfig).toHaveBeenCalledTimes(2);
    expect(getAiChatConfig).toHaveBeenNthCalledWith(1, "diag-1");
    expect(getAiChatConfig).toHaveBeenNthCalledWith(2, "diag-2");
  });

  it("diagramId가 변경되면 getSessions를 새 diagramId로 다시 호출한다", async () => {
    const { rerender } = renderHook(
      ({ diagramId }: { diagramId: string }) => useAIModelSelection(diagramId),
      { initialProps: { diagramId: "diag-1" } },
    );

    await waitFor(() => expect(getSessions).toHaveBeenCalledWith("diag-1"));

    rerender({ diagramId: "diag-2" });

    await waitFor(() => expect(getSessions).toHaveBeenCalledWith("diag-2"));
  });

  it("동일한 diagramId로 리렌더링 시 API를 재호출하지 않는다", async () => {
    const { rerender } = renderHook(
      ({ diagramId }: { diagramId: string }) => useAIModelSelection(diagramId),
      { initialProps: { diagramId: "diag-1" } },
    );

    await waitFor(() => expect(getAiChatConfig).toHaveBeenCalledTimes(1));

    rerender({ diagramId: "diag-1" });

    // 동일 diagramId 리렌더 — 추가 호출 없음
    expect(getAiChatConfig).toHaveBeenCalledTimes(1);
  });
});
