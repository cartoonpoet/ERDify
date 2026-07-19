import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useEditorModals } from "./useEditorModals";

describe("useEditorModals", () => {
  it("initializes with every modal flag closed", () => {
    const { result } = renderHook(() => useEditorModals("diag-1"));

    expect(result.current.showInvite).toBe(false);
    expect(result.current.showExport).toBe(false);
    expect(result.current.showShare).toBe(false);
    expect(result.current.showImport).toBe(false);
    expect(result.current.showFileMenu).toBe(false);
    expect(result.current.showSaveCopy).toBe(false);
  });

  it("setShowInvite opens and closes the invite modal", () => {
    const { result } = renderHook(() => useEditorModals("diag-1"));

    act(() => { result.current.setShowInvite(true); });
    expect(result.current.showInvite).toBe(true);

    act(() => { result.current.setShowInvite(false); });
    expect(result.current.showInvite).toBe(false);
  });

  it("setShowExport opens and closes the export modal", () => {
    const { result } = renderHook(() => useEditorModals("diag-1"));

    act(() => { result.current.setShowExport(true); });
    expect(result.current.showExport).toBe(true);

    act(() => { result.current.setShowExport(false); });
    expect(result.current.showExport).toBe(false);
  });

  it("setShowShare opens and closes the share modal", () => {
    const { result } = renderHook(() => useEditorModals("diag-1"));

    act(() => { result.current.setShowShare(true); });
    expect(result.current.showShare).toBe(true);

    act(() => { result.current.setShowShare(false); });
    expect(result.current.showShare).toBe(false);
  });

  it("setShowImport opens and closes the import modal", () => {
    const { result } = renderHook(() => useEditorModals("diag-1"));

    act(() => { result.current.setShowImport(true); });
    expect(result.current.showImport).toBe(true);

    act(() => { result.current.setShowImport(false); });
    expect(result.current.showImport).toBe(false);
  });

  it("setShowSaveCopy opens and closes the save-copy modal", () => {
    const { result } = renderHook(() => useEditorModals("diag-1"));

    act(() => { result.current.setShowSaveCopy(true); });
    expect(result.current.showSaveCopy).toBe(true);

    act(() => { result.current.setShowSaveCopy(false); });
    expect(result.current.showSaveCopy).toBe(false);
  });

  it("handleFileMenuOpen opens the file menu", () => {
    const { result } = renderHook(() => useEditorModals("diag-1"));

    act(() => { result.current.handleFileMenuOpen(); });

    expect(result.current.showFileMenu).toBe(true);
  });

  it("handleFileMenuClose closes the file menu", () => {
    const { result } = renderHook(() => useEditorModals("diag-1"));

    act(() => { result.current.handleFileMenuOpen(); });
    expect(result.current.showFileMenu).toBe(true);

    act(() => { result.current.handleFileMenuClose(); });
    expect(result.current.showFileMenu).toBe(false);
  });

  it("handleImportOpen closes the file menu and opens the import modal", () => {
    const { result } = renderHook(() => useEditorModals("diag-1"));

    act(() => { result.current.handleFileMenuOpen(); });
    act(() => { result.current.handleImportOpen(); });

    expect(result.current.showFileMenu).toBe(false);
    expect(result.current.showImport).toBe(true);
  });

  it("handleExportOpen closes the file menu and opens the export modal", () => {
    const { result } = renderHook(() => useEditorModals("diag-1"));

    act(() => { result.current.handleFileMenuOpen(); });
    act(() => { result.current.handleExportOpen(); });

    expect(result.current.showFileMenu).toBe(false);
    expect(result.current.showExport).toBe(true);
  });

  it("handleSaveCopyOpen closes the file menu and opens save-copy when diagramId is defined", () => {
    const { result } = renderHook(() => useEditorModals("diag-1"));

    act(() => { result.current.handleFileMenuOpen(); });
    act(() => { result.current.handleSaveCopyOpen(); });

    expect(result.current.showFileMenu).toBe(false);
    expect(result.current.showSaveCopy).toBe(true);
  });

  it("handleSaveCopyOpen is a no-op guard when diagramId is undefined", () => {
    const { result } = renderHook(() => useEditorModals(undefined));

    act(() => { result.current.handleFileMenuOpen(); });
    act(() => { result.current.handleSaveCopyOpen(); });

    // guard clause returns early: file menu stays open, save-copy modal never opens
    expect(result.current.showFileMenu).toBe(true);
    expect(result.current.showSaveCopy).toBe(false);
  });
});
