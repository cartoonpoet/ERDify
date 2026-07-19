import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DiagramColumn } from "@erdify/domain";
import type { ColumnSuggestion } from "@erdify/contracts";
import { useColumnNameSuggestions } from "./useColumnNameSuggestions";

vi.mock("@/features/ai/api/ai.api", () => ({
  suggestColumns: vi.fn(),
}));

import { suggestColumns } from "@/features/ai/api/ai.api";

const col = (name: string): DiagramColumn => ({
  id: `col-${name}`,
  name,
  type: "varchar",
  nullable: true,
  primaryKey: false,
  unique: false,
  defaultValue: null,
  comment: null,
  ordinal: 0,
});

const makeSuggestions = (): ColumnSuggestion[] => [
  { name: "email", type: "varchar", nullable: false, pk: false },
  { name: "email_verified_at", type: "timestamp", nullable: true, pk: false },
  { name: "created_at", type: "timestamp", nullable: false, pk: false },
];

describe("useColumnNameSuggestions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("has empty suggestions and no active column initially", () => {
    const { result } = renderHook(() => useColumnNameSuggestions("users", []));

    expect(result.current.suggestions).toEqual([]);
    expect(result.current.activeSuggestionColId).toBe(null);
  });

  it("clears suggestions without calling the API when input is under the 2-char threshold", () => {
    vi.mocked(suggestColumns).mockResolvedValue(makeSuggestions());
    const { result } = renderHook(() => useColumnNameSuggestions("users", []));

    act(() => {
      result.current.handleColumnNameInput("col-1", "e");
    });

    expect(result.current.suggestions).toEqual([]);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(suggestColumns).not.toHaveBeenCalled();
  });

  it("debounces and calls the API after 300ms when 2+ chars are typed, filtering results by prefix", async () => {
    vi.mocked(suggestColumns).mockResolvedValue(makeSuggestions());
    const existingColumns = [col("id"), col("name")];
    const { result } = renderHook(() =>
      useColumnNameSuggestions("users", existingColumns)
    );

    act(() => {
      result.current.handleColumnNameInput("col-1", "em");
    });

    // Not called yet — still within debounce window
    expect(suggestColumns).not.toHaveBeenCalled();
    expect(result.current.activeSuggestionColId).toBe("col-1");

    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(suggestColumns).toHaveBeenCalledTimes(1);
    expect(suggestColumns).toHaveBeenCalledWith("users", ["id", "name"]);
    expect(result.current.suggestions).toEqual([
      { name: "email", type: "varchar", nullable: false, pk: false },
      { name: "email_verified_at", type: "timestamp", nullable: true, pk: false },
    ]);
  });

  it("resets suggestions and active column when clearSuggestions is called", async () => {
    vi.mocked(suggestColumns).mockResolvedValue(makeSuggestions());
    const { result } = renderHook(() => useColumnNameSuggestions("users", []));

    act(() => {
      result.current.handleColumnNameInput("col-1", "em");
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.suggestions.length).toBeGreaterThan(0);
    expect(result.current.activeSuggestionColId).toBe("col-1");

    act(() => {
      result.current.clearSuggestions();
    });

    expect(result.current.suggestions).toEqual([]);
    expect(result.current.activeSuggestionColId).toBe(null);
  });

  it("cancels a pending debounced call when the input changes again before it fires", async () => {
    vi.mocked(suggestColumns).mockResolvedValue(makeSuggestions());
    const { result } = renderHook(() => useColumnNameSuggestions("users", []));

    act(() => {
      result.current.handleColumnNameInput("col-1", "em");
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Re-type before the first debounce fires — should reset the timer.
    act(() => {
      result.current.handleColumnNameInput("col-1", "ema");
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Total elapsed since first keystroke is 400ms, but only 200ms since the second —
    // the first call must have been cancelled and not yet fired.
    expect(suggestColumns).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(suggestColumns).toHaveBeenCalledTimes(1);
    expect(suggestColumns).toHaveBeenCalledWith("users", []);
  });
});
