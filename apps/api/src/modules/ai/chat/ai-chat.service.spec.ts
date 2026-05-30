import { describe, it, expect, vi } from "vitest";
import * as domain from "@erdify/domain";
import { AiChatService } from "./ai-chat.service";
import type { AiProvider, ProviderTurn } from "../providers/provider.types";
import type { AiStreamEvent } from "@erdify/contracts";
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
    getOrgApiKeyAndProvider: vi.fn(async () => ({ apiKey: "k", provider: "anthropic", model: "m" })),
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
  );
  return { svc };
}

describe("AiChatService.runChat", () => {
  it("도구 호출이 없으면 1회 turn 후 done을 emit한다", async () => {
    const { svc } = makeService([{ text: "안녕하세요", toolCalls: [] }]);
    const events: AiStreamEvent[] = [];
    await svc.runChat({ userId: "u1", diagramId: "d1", message: "hi", enableReadTools: false }, (e) => events.push(e));

    const done = events.find((e) => e.type === "done");
    expect(done).toMatchObject({ type: "done", content: "안녕하세요", diff: null });
    expect(events.some((e) => e.type === "step")).toBe(true);
  });

  it("도구 호출을 실행하고 결과를 다음 turn에 먹인 뒤 종료한다", async () => {
    const { svc } = makeService([
      { text: "", toolCalls: [{ id: "t1", name: "addTable", input: { name: "users" } }] },
      { text: "users 테이블을 추가했어요", toolCalls: [] },
    ]);
    const events: AiStreamEvent[] = [];
    await svc.runChat({ userId: "u1", diagramId: "d1", message: "users 테이블", enableReadTools: false }, (e) => events.push(e));

    expect(events.some((e) => e.type === "tool_call")).toBe(true);
    expect(events.some((e) => e.type === "tool_result")).toBe(true);
    const done = events.find((e) => e.type === "done") as Extract<AiStreamEvent, { type: "done" }>;
    expect(done.diff).toHaveLength(1);
    expect(done.pendingDocument?.entities).toHaveLength(1);
  });
});
