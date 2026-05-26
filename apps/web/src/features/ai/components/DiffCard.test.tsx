import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DiffCard } from "./DiffCard";
import type { DiffChange } from "@erdify/contracts";

const makeDiffs = (count: number): DiffChange[] =>
  Array.from({ length: count }, (_, i) => ({
    type: "addTable" as const,
    tableId: `tbl-${i}`,
    tableName: `table_${i}`,
  }));

describe("DiffCard", () => {
  let onOpenReview: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onOpenReview = vi.fn();
  });

  it("accepted=null 일 때 '검토하기' 버튼을 렌더링한다", () => {
    render(
      <DiffCard
        messageId="msg-1"
        diff={makeDiffs(3)}
        accepted={null}
        onOpenReview={onOpenReview}
      />
    );

    expect(screen.getByRole("button", { name: /검토하기/i })).toBeInTheDocument();
  });

  it("accepted=null 일 때 변경사항 개수를 표시한다", () => {
    render(
      <DiffCard
        messageId="msg-1"
        diff={makeDiffs(5)}
        accepted={null}
        onOpenReview={onOpenReview}
      />
    );

    expect(screen.getByText(/5개 변경사항/i)).toBeInTheDocument();
  });

  it("accepted=true 일 때 수락 상태 메시지를 렌더링한다", () => {
    render(
      <DiffCard
        messageId="msg-1"
        diff={makeDiffs(2)}
        accepted={true}
        onOpenReview={onOpenReview}
      />
    );

    expect(screen.getByText(/변경사항 적용됨/i)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("accepted=false 일 때 거절 상태 메시지를 렌더링한다", () => {
    render(
      <DiffCard
        messageId="msg-1"
        diff={makeDiffs(2)}
        accepted={false}
        onOpenReview={onOpenReview}
      />
    );

    expect(screen.getByText(/변경사항 거절됨/i)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("'검토하기' 버튼 클릭 시 onOpenReview를 올바른 messageId로 호출한다", () => {
    render(
      <DiffCard
        messageId="msg-42"
        diff={makeDiffs(1)}
        accepted={null}
        onOpenReview={onOpenReview}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /검토하기/i }));

    expect(onOpenReview).toHaveBeenCalledTimes(1);
    expect(onOpenReview).toHaveBeenCalledWith("msg-42");
  });

  it("diff가 빈 배열이어도 '0개 변경사항'을 표시하고 버튼은 보인다", () => {
    render(
      <DiffCard
        messageId="msg-0"
        diff={[]}
        accepted={null}
        onOpenReview={onOpenReview}
      />
    );

    expect(screen.getByText(/0개 변경사항/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /검토하기/i })).toBeInTheDocument();
  });

  it("accepted=true 일 때 onOpenReview를 클릭해도 버튼이 없으므로 호출되지 않는다", () => {
    render(
      <DiffCard
        messageId="msg-1"
        diff={makeDiffs(1)}
        accepted={true}
        onOpenReview={onOpenReview}
      />
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(onOpenReview).not.toHaveBeenCalled();
  });
});
