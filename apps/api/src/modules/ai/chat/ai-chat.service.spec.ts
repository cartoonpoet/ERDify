import { describe, it, expect, vi } from "vitest";
import * as domain from "@erdify/domain";
import { AiChatService, type StreamEvent } from "./ai-chat.service";
import type { AiProvider, ProviderTurn, ConvMessage } from "../providers/provider.types";
import { ToolExecutor } from "../tools/tool-executor";
import { DomainLoaderService } from "../../../common/services/domain-loader.service";
import type { DiagramDocument } from "@erdify/domain";

const loader = { load: async () => domain } as unknown as DomainLoaderService;

const doc: DiagramDocument = {
  format: "erdify.schema.v1",
  id: "d1",
  name: "shop",
  dialect: "postgresql",
  entities: [],
  relationships: [],
  indexes: [],
  views: [],
  layout: { entityPositions: {} },
  metadata: { revision: 1, stableObjectIds: true, createdAt: "", updatedAt: "" },
};

type Svc = AiChatService;

function makeService(turns: ProviderTurn[]): { svc: Svc } {
  let i = 0;
  const provider: AiProvider = {
    streamTurn: vi.fn(async (a) => {
      a.onText("…");
      return turns[i++]!;
    }),
  };
  const aiService = {
    getDiagramAndOrgId: vi.fn(async () => ({ doc, orgId: "o1", diagramName: "shop" })),
    resolveChatCredentials: vi.fn(async () => ({ apiKey: "k", provider: "anthropic", model: "m" })),
  };
  const history = {
    findRecentTurns: vi.fn(async () => []),
    saveUserMessage: vi.fn(async () => undefined),
    saveAssistantMessage: vi.fn(async () => ({ id: "msg1" })),
  };
  const usage = { log: vi.fn(async () => undefined) };
  const userRepo = { findOne: vi.fn(async () => ({ name: "u", email: "e@x.com" })) };
  const orgRepo = { findOne: vi.fn(async () => ({ name: "Acme" })) };

  const svc = new AiChatService(
    aiService as never,
    history as never,
    new ToolExecutor(loader),
    usage as never,
    provider as never,
    provider as never,
    provider as never,
    userRepo as never,
    orgRepo as never,
    loader,
  );
  return { svc };
}

describe("AiChatService.runChat", () => {
  it("도구 호출이 없으면 1회 turn 후 done을 emit한다", async () => {
    const { svc } = makeService([{ text: "안녕하세요", toolCalls: [], truncated: false }]);
    const events: StreamEvent[] = [];
    await svc.runChat({ userId: "u1", diagramId: "d1", message: "hi", sessionId: "s1" }, (e) => events.push(e));

    const done = events.find((e) => e.event === "done");
    expect(done).toMatchObject({ event: "done", content: "안녕하세요", diff: null });
    expect(events.some((e) => e.event === "text")).toBe(true);
  });

  it("도구 호출을 실행하고 결과를 다음 turn에 먹인 뒤 종료한다", async () => {
    const { svc } = makeService([
      { text: "", toolCalls: [{ id: "t1", name: "addTable", input: { name: "users" } }], truncated: false },
      { text: "users 테이블을 추가했어요", toolCalls: [], truncated: false },
    ]);
    const events: StreamEvent[] = [];
    await svc.runChat({ userId: "u1", diagramId: "d1", message: "users 테이블", sessionId: "s1" }, (e) => events.push(e));

    // 도구 실행은 status 이벤트(메시지 본문에 누적되지 않는 진행 표시)로 노출
    expect(events.some((e) => e.event === "status")).toBe(true);
    const done = events.find((e) => e.event === "done") as Extract<StreamEvent, { event: "done" }>;
    expect(done.diff).toHaveLength(1);
    expect(done.pendingDocument?.entities).toHaveLength(1);
  });

  it("스키마를 조회만 하고 변경이 없으면 적용을 유도해 결국 diff를 만든다", async () => {
    const { svc } = makeService([
      { text: "", toolCalls: [{ id: "r1", name: "getTableDetails", input: { tableId: "e1" } }], truncated: false },
      { text: "정규화 분석 결과입니다.", toolCalls: [], truncated: false }, // 분석만 → nudge 발동
      { text: "개선사항을 적용했습니다.", toolCalls: [{ id: "t1", name: "addTable", input: { name: "roles" } }], truncated: false },
      { text: "완료", toolCalls: [], truncated: false },
    ]);
    const events: StreamEvent[] = [];
    await svc.runChat({ userId: "u1", diagramId: "d1", message: "정규화할 거 있어?", sessionId: "s1" }, (e) => events.push(e));

    const done = events.find((e) => e.event === "done") as Extract<StreamEvent, { event: "done" }>;
    expect(done.diff).toHaveLength(1);
    expect(done.pendingDocument?.entities.some((e) => e.name === "roles")).toBe(true);
  });

  it("출력 길이 제한으로 응답이 잘리면 끊긴 작업을 이어가 끝까지 적용한다", async () => {
    // 큰 테이블 정규화처럼 변경량이 많아 한 turn 출력이 max_tokens에 걸려 잘린 상황을 모사한다.
    // 첫 turn은 일부만 적용하고 truncated=true로 끝난다 → 이어가기 nudge 후 나머지를 마저 적용해야 한다.
    const captured: ConvMessage[][] = [];
    let i = 0;
    const turns: ProviderTurn[] = [
      // 1) users를 분리하던 중 출력이 잘림 → 도구 결과로 자연스럽게 다음 turn 진행(이미 적용한 변경 유지)
      { text: "users 분리 중…", toolCalls: [{ id: "t1", name: "addTable", input: { name: "users" } }], truncated: true },
      // 2) 도구 없이 텍스트만 내다가 또 잘림 → 이어가기 nudge가 발동돼야 함
      { text: "이어서 roles를…", toolCalls: [], truncated: true },
      // 3) nudge를 받고 나머지(roles)를 마저 적용
      { text: "roles까지 적용", toolCalls: [{ id: "t2", name: "addTable", input: { name: "roles" } }], truncated: false },
      // 4) 모든 작업 완료
      { text: "정규화를 모두 마쳤어요", toolCalls: [], truncated: false },
    ];
    const provider: AiProvider = {
      streamTurn: vi.fn(async (a) => {
        captured.push(JSON.parse(JSON.stringify(a.messages)));
        a.onText("…");
        return turns[i++]!;
      }),
    };
    const aiService = {
      getDiagramAndOrgId: vi.fn(async () => ({ doc, orgId: "o1", diagramName: "shop" })),
      resolveChatCredentials: vi.fn(async () => ({ apiKey: "k", provider: "anthropic", model: "m" })),
    };
    const history = { findRecentTurns: vi.fn(async () => []), saveUserMessage: vi.fn(async () => undefined), saveAssistantMessage: vi.fn(async () => ({ id: "m" })) };
    const usage = { log: vi.fn(async () => undefined) };
    const userRepo = { findOne: vi.fn(async () => ({ name: "u", email: "e" })) };
    const orgRepo = { findOne: vi.fn(async () => ({ name: "o" })) };
    const svc = new AiChatService(aiService as never, history as never, new ToolExecutor(loader), usage as never, provider as never, provider as never, provider as never, userRepo as never, orgRepo as never, loader);

    const events: StreamEvent[] = [];
    await svc.runChat({ userId: "u1", diagramId: "d1", message: "Contract 정규화해줘", sessionId: "s1" }, (e) => events.push(e));

    // 잘린 뒤 이어가기 nudge가 한 번 들어가고, 양쪽 turn의 변경이 모두 적용돼야 한다.
    const allUserContents = captured.flat().filter((m) => m.role === "user").map((m) => (m as { content: string }).content);
    expect(allUserContents.some((c) => c.includes("출력 길이 제한"))).toBe(true);
    const done = events.find((e) => e.event === "done") as Extract<StreamEvent, { event: "done" }>;
    expect(done.diff).toHaveLength(2);
    expect(done.pendingDocument?.entities.map((e) => e.name).sort()).toEqual(["roles", "users"]);
  });

  it("읽기 도구를 쓰지 않은 순수 정보 질문은 적용을 유도하지 않는다", async () => {
    const streamTurn = vi.fn(async () => ({ text: "3NF는 이행적 종속을 제거합니다.", toolCalls: [], truncated: false }));
    const provider = { streamTurn } as never;
    const aiService = {
      getDiagramAndOrgId: vi.fn(async () => ({ doc, orgId: "o1", diagramName: "shop" })),
      resolveChatCredentials: vi.fn(async () => ({ apiKey: "k", provider: "anthropic", model: "m" })),
    };
    const history = { findRecentTurns: vi.fn(async () => []), saveUserMessage: vi.fn(async () => undefined), saveAssistantMessage: vi.fn(async () => ({ id: "m" })) };
    const usage = { log: vi.fn(async () => undefined) };
    const userRepo = { findOne: vi.fn(async () => ({ name: "u", email: "e" })) };
    const orgRepo = { findOne: vi.fn(async () => ({ name: "o" })) };
    const svc = new AiChatService(aiService as never, history as never, new ToolExecutor(loader), usage as never, provider, provider, provider, userRepo as never, orgRepo as never, loader);

    const events: StreamEvent[] = [];
    await svc.runChat({ userId: "u1", diagramId: "d1", message: "3NF가 뭐야?", sessionId: "s1" }, (e) => events.push(e));

    expect(streamTurn).toHaveBeenCalledTimes(1); // nudge 없이 1회로 종료
    const done = events.find((e) => e.event === "done") as Extract<StreamEvent, { event: "done" }>;
    expect(done.diff).toBeNull();
  });

  it("추출된 컨벤션을 시스템 프롬프트의 DETECTED CONVENTIONS 블록으로 주입한다", async () => {
    const convDoc: DiagramDocument = {
      ...doc,
      entities: [
        {
          id: "e1", name: "contract", schema: null, logicalName: null, comment: null, color: null,
          columns: [
            { id: "c1", name: "contract_id", type: "uuid", nullable: false, primaryKey: true, unique: false, defaultValue: null, comment: "고유 식별자", ordinal: 0 },
            { id: "c2", name: "user_id", type: "uuid", nullable: false, primaryKey: false, unique: false, defaultValue: null, comment: "사용자", ordinal: 1 },
          ],
        },
      ],
      indexes: [{ id: "i1", entityId: "e1", name: "idx_contract_user_id", columnIds: ["c2"], unique: false }],
    };
    let captured = "";
    const provider: AiProvider = {
      streamTurn: vi.fn(async (a) => {
        captured = a.system;
        a.onText("…");
        return { text: "안녕", toolCalls: [], truncated: false };
      }),
    };
    const aiService = {
      getDiagramAndOrgId: vi.fn(async () => ({ doc: convDoc, orgId: "o1", diagramName: "shop" })),
      resolveChatCredentials: vi.fn(async () => ({ apiKey: "k", provider: "anthropic", model: "m" })),
    };
    const history = { findRecentTurns: vi.fn(async () => []), saveUserMessage: vi.fn(async () => undefined), saveAssistantMessage: vi.fn(async () => ({ id: "m" })) };
    const usage = { log: vi.fn(async () => undefined) };
    const userRepo = { findOne: vi.fn(async () => ({ name: "u", email: "e" })) };
    const orgRepo = { findOne: vi.fn(async () => ({ name: "o" })) };
    const svc = new AiChatService(aiService as never, history as never, new ToolExecutor(loader), usage as never, provider as never, provider as never, provider as never, userRepo as never, orgRepo as never, loader);

    await svc.runChat({ userId: "u1", diagramId: "d1", message: "hi", sessionId: "s1" }, () => {});

    expect(captured).toContain("DETECTED CONVENTIONS");
    expect(captured).toContain("idx_<table>_<col>");
    expect(captured).toContain("<table>_id");
  });

  it("적용 전 검증에서 새 오류가 나오면 모델에게 수정을 요구하는 메시지를 다시 보낸다", async () => {
    // "bad" 이름의 엔티티가 있으면 검증 실패하도록 domain.validateDiagram을 오버라이드
    const failingDomain = {
      ...domain,
      validateDiagram: (d: DiagramDocument) =>
        d.entities.some((e) => e.name === "bad")
          ? { valid: false, errors: ["INVALID_BAD_TABLE"] }
          : { valid: true, errors: [] },
    };
    const failingLoader = { load: async () => failingDomain } as unknown as DomainLoaderService;

    let i = 0;
    const turns: ProviderTurn[] = [
      { text: "", toolCalls: [{ id: "t1", name: "addTable", input: { name: "bad" } }], truncated: false }, // diff 생성
      { text: "끝", toolCalls: [], truncated: false }, // 검증 실패 → 수정 요구 (시도 1)
      { text: "끝", toolCalls: [], truncated: false }, // 검증 여전히 실패 → 수정 요구 (시도 2)
      { text: "끝", toolCalls: [], truncated: false }, // MAX_VALIDATION_RETRIES 도달 → 종료
    ];
    const captured: ConvMessage[][] = [];
    const provider: AiProvider = {
      streamTurn: vi.fn(async (a) => {
        captured.push(JSON.parse(JSON.stringify(a.messages)));
        a.onText("…");
        return turns[i++]!;
      }),
    };
    const aiService = {
      getDiagramAndOrgId: vi.fn(async () => ({ doc, orgId: "o1", diagramName: "shop" })),
      resolveChatCredentials: vi.fn(async () => ({ apiKey: "k", provider: "anthropic", model: "m" })),
    };
    const history = { findRecentTurns: vi.fn(async () => []), saveUserMessage: vi.fn(async () => undefined), saveAssistantMessage: vi.fn(async () => ({ id: "m" })) };
    const usage = { log: vi.fn(async () => undefined) };
    const userRepo = { findOne: vi.fn(async () => ({ name: "u", email: "e" })) };
    const orgRepo = { findOne: vi.fn(async () => ({ name: "o" })) };
    const svc = new AiChatService(
      aiService as never, history as never, new ToolExecutor(failingLoader), usage as never,
      provider as never, provider as never, provider as never, userRepo as never, orgRepo as never, failingLoader,
    );

    const events: StreamEvent[] = [];
    await svc.runChat({ userId: "u1", diagramId: "d1", message: "테이블 추가", sessionId: "s1" }, (e) => events.push(e));

    // 검증 실패로 최소 2번의 추가 수정 요구가 발생 (총 4회 turn)
    expect(provider.streamTurn).toHaveBeenCalledTimes(4);
    // 수정 요구 메시지에 검증 오류 문자열이 포함된다
    const allUserContents = captured.flat().filter((m) => m.role === "user").map((m) => (m as { content: string }).content);
    expect(allUserContents.some((c) => c.includes("INVALID_BAD_TABLE"))).toBe(true);
  });
});
