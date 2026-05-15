import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDiagramImport } from "./useDiagramImport";

vi.mock("@/shared/api/diagrams.api", () => ({
  createDiagram: vi.fn().mockResolvedValue({ id: "new-diagram-id" }),
}));

vi.mock("@/shared/utils/ddl-parser", () => ({
  parseDdl: vi.fn().mockReturnValue({
    format: "erdify.schema.v1",
    entities: [],
    relationships: [],
    indexes: [],
  }),
}));

vi.mock("@/shared/utils/exerd-parser", () => ({
  parseExerd: vi.fn().mockReturnValue({ entities: [], relationships: [], indexes: [] }),
}));

vi.mock("@/shared/utils/uuid", () => ({
  randomUUID: vi.fn().mockReturnValue("test-uuid"),
}));

import * as diagramsApi from "@/shared/api/diagrams.api";

const makeFile = (name: string, content = "SELECT 1;") =>
  new File([content], name, { type: "text/plain" });

const defaultOptions = {
  projectId: "proj-1",
  onImported: vi.fn(),
  onClose: vi.fn(),
};

describe("useDiagramImport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(diagramsApi.createDiagram).mockResolvedValue({ id: "new-diagram-id" } as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // 1. Initial state
  it("has correct initial state", () => {
    const { result } = renderHook(() => useDiagramImport(defaultOptions));

    expect(result.current.activeTab).toBe("mysql");
    expect(result.current.name).toBe("");
    expect(result.current.error).toBe(null);
    expect(result.current.loading).toBe(false);
    expect(result.current.canSubmit).toBe(false);
  });

  // 2. handleTabSwitch changes tab and clears error
  it("handleTabSwitch changes the active tab and clears error", () => {
    const { result } = renderHook(() => useDiagramImport(defaultOptions));

    act(() => {
      result.current.handleTabSwitch("postgresql");
    });
    expect(result.current.activeTab).toBe("postgresql");
    expect(result.current.error).toBe(null);

    // First introduce an error, then switch tab
    act(() => {
      result.current.handleTabSwitch("mssql");
    });
    expect(result.current.activeTab).toBe("mssql");
    expect(result.current.error).toBe(null);
  });

  it("handleTabSwitch clears error when switching tabs", () => {
    const { result } = renderHook(() => useDiagramImport(defaultOptions));

    // Trigger an error via acceptSqlFiles with invalid file
    act(() => {
      result.current.acceptSqlFiles([makeFile("bad.txt")]);
    });
    expect(result.current.error).not.toBe(null);

    act(() => {
      result.current.handleTabSwitch("postgresql");
    });
    expect(result.current.error).toBe(null);
  });

  // 3. handleDdlChange updates ddlText and auto-detects table name from CREATE TABLE
  it("handleDdlChange updates ddlText and auto-detects table name from CREATE TABLE", () => {
    const { result } = renderHook(() => useDiagramImport(defaultOptions));

    const sql = "CREATE TABLE users (\n  id INT PRIMARY KEY\n);";
    act(() => {
      result.current.handleDdlChange(sql);
    });

    expect(result.current.ddlText).toBe(sql);
    expect(result.current.name).toBe("users");
  });

  // 4. handleDdlChange does NOT overwrite a manually set name
  it("handleDdlChange does not overwrite a manually set name", () => {
    const { result } = renderHook(() => useDiagramImport(defaultOptions));

    act(() => {
      result.current.setName("my-custom-name");
    });

    const sql = "CREATE TABLE orders (\n  id INT PRIMARY KEY\n);";
    act(() => {
      result.current.handleDdlChange(sql);
    });

    expect(result.current.ddlText).toBe(sql);
    expect(result.current.name).toBe("my-custom-name");
  });

  // 5. acceptSqlFiles rejects non-.sql files
  it("acceptSqlFiles rejects non-.sql files and sets error", () => {
    const { result } = renderHook(() => useDiagramImport(defaultOptions));

    act(() => {
      result.current.acceptSqlFiles([makeFile("schema.txt")]);
    });

    expect(result.current.error).toBe(".sql 파일만 지원합니다.");
    expect(result.current.sqlFiles).toHaveLength(0);
  });

  // 6. acceptSqlFiles accepts .sql files and updates sqlFiles state
  it("acceptSqlFiles accepts .sql files and updates sqlFiles", () => {
    const { result } = renderHook(() => useDiagramImport(defaultOptions));

    const sqlFile = makeFile("schema.sql");
    act(() => {
      result.current.acceptSqlFiles([sqlFile]);
    });

    expect(result.current.error).toBe(null);
    expect(result.current.sqlFiles).toHaveLength(1);
    expect(result.current.sqlFiles[0]!.name).toBe("schema.sql");
  });

  // 7. acceptSqlFiles deduplicates files with same name
  it("acceptSqlFiles deduplicates files with the same name", () => {
    const { result } = renderHook(() => useDiagramImport(defaultOptions));

    const file1 = makeFile("schema.sql", "content1");
    const file2 = makeFile("schema.sql", "content2");

    act(() => {
      result.current.acceptSqlFiles([file1]);
    });
    act(() => {
      result.current.acceptSqlFiles([file2]);
    });

    expect(result.current.sqlFiles).toHaveLength(1);
    expect(result.current.sqlFiles[0]!.name).toBe("schema.sql");
  });

  // 8. handleClose calls onClose and resets state
  it("handleClose calls onClose and resets state", () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useDiagramImport({ ...defaultOptions, onClose })
    );

    // Change some state first
    act(() => {
      result.current.setName("some-name");
      result.current.handleTabSwitch("postgresql");
    });

    act(() => {
      result.current.handleClose();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(result.current.name).toBe("");
    expect(result.current.activeTab).toBe("mysql");
    expect(result.current.error).toBe(null);
  });

  // 9. handleSubmit with empty name sets error
  it("handleSubmit with empty name sets error '다이어그램 이름을 입력하세요.'", async () => {
    const { result } = renderHook(() => useDiagramImport(defaultOptions));

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.error).toBe("다이어그램 이름을 입력하세요.");
    expect(diagramsApi.createDiagram).not.toHaveBeenCalled();
  });

  // 10. handleSubmit with DDL tab, no files/text sets error
  it("handleSubmit on DDL tab with no files or text sets error", async () => {
    const { result } = renderHook(() => useDiagramImport(defaultOptions));

    act(() => {
      result.current.setName("my-diagram");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.error).toBe("DDL SQL을 입력하거나 파일을 선택하세요.");
    expect(diagramsApi.createDiagram).not.toHaveBeenCalled();
  });

  // 11. handleSubmit succeeds with DDL text → calls createDiagram, calls onImported
  it("handleSubmit with DDL text calls createDiagram and onImported with new id", async () => {
    const onImported = vi.fn();
    const { result } = renderHook(() =>
      useDiagramImport({ ...defaultOptions, onImported })
    );

    // handleDdlChange auto-detects "users" from CREATE TABLE when name is empty,
    // so we first set the DDL (which auto-sets name="users"), then override the name.
    act(() => {
      result.current.handleDdlChange("CREATE TABLE users (id INT PRIMARY KEY);");
    });
    act(() => {
      result.current.setName("my-diagram");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(diagramsApi.createDiagram).toHaveBeenCalledWith(
      "proj-1",
      expect.objectContaining({ name: "my-diagram" })
    );
    expect(onImported).toHaveBeenCalledWith("new-diagram-id");
  });

  // 12. canSubmit is true only when name is set AND (exerd tab has file OR DDL tab has text/files)
  it("canSubmit is false when name is empty", () => {
    const { result } = renderHook(() => useDiagramImport(defaultOptions));
    expect(result.current.canSubmit).toBe(false);
  });

  it("canSubmit is false when name is set but DDL tab has no text or files", () => {
    const { result } = renderHook(() => useDiagramImport(defaultOptions));
    act(() => {
      result.current.setName("my-diagram");
    });
    expect(result.current.canSubmit).toBe(false);
  });

  it("canSubmit is true when name is set and DDL text is provided", () => {
    const { result } = renderHook(() => useDiagramImport(defaultOptions));
    act(() => {
      result.current.setName("my-diagram");
      result.current.handleDdlChange("CREATE TABLE users (id INT);");
    });
    expect(result.current.canSubmit).toBe(true);
  });

  it("canSubmit is true when name is set and SQL files are provided on DDL tab", () => {
    const { result } = renderHook(() => useDiagramImport(defaultOptions));
    act(() => {
      result.current.setName("my-diagram");
      result.current.acceptSqlFiles([makeFile("schema.sql")]);
    });
    expect(result.current.canSubmit).toBe(true);
  });

  it("canSubmit is false on exerd tab when name is set but no exerd file", () => {
    const { result } = renderHook(() => useDiagramImport(defaultOptions));
    act(() => {
      result.current.handleTabSwitch("exerd");
      result.current.setName("my-diagram");
    });
    expect(result.current.canSubmit).toBe(false);
  });
});
