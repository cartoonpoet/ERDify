import {
  acceptAiDiff,
  rejectAiDiff,
  suggestColumns,
  getOrgAiSettings,
  setOrgProviderKey,
  removeOrgProviderKey,
  setEnabledModels,
  sendAiChatStream,
  getAiChatConfig,
  getSessions,
  createSession,
  getSessionMessages,
  type AiChatStreamOptions,
} from "./ai.api";
import { httpClient } from "@/shared/api/httpClient";

vi.mock("@/shared/api/httpClient", () => ({
  API_BASE_URL: "http://test-api",
  httpClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

describe("ai.api", () => {
  it("acceptAiDiff는 POST /ai/chat/:id/accept를 호출하고 void를 반환한다", async () => {
    vi.mocked(httpClient.post).mockResolvedValue({ data: undefined });

    const result = await acceptAiDiff("msg-1");

    expect(httpClient.post).toHaveBeenCalledWith("/ai/chat/msg-1/accept");
    expect(result).toBeUndefined();
  });

  it("rejectAiDiff는 POST /ai/chat/:id/reject를 호출하고 void를 반환한다", async () => {
    vi.mocked(httpClient.post).mockResolvedValue({ data: undefined });

    const result = await rejectAiDiff("msg-1");

    expect(httpClient.post).toHaveBeenCalledWith("/ai/chat/msg-1/reject");
    expect(result).toBeUndefined();
  });

  it("suggestColumns는 POST /ai/suggest-columns를 호출하고 r.data를 반환한다", async () => {
    const mockSuggestions = [{ name: "id", type: "INT" }, { name: "name", type: "VARCHAR" }];
    vi.mocked(httpClient.post).mockResolvedValue({ data: mockSuggestions });

    const result = await suggestColumns("users", ["id"]);

    expect(httpClient.post).toHaveBeenCalledWith("/ai/suggest-columns", {
      tableName: "users",
      existingColumns: ["id"],
    });
    expect(result).toEqual(mockSuggestions);
  });

  it("getOrgAiSettings는 GET /organizations/:orgId/ai-settings를 호출하고 r.data를 반환한다", async () => {
    const mockSettings = { provider: "anthropic", model: "claude-3-5-sonnet-20241022", hasApiKey: true };
    vi.mocked(httpClient.get).mockResolvedValue({ data: mockSettings });

    const result = await getOrgAiSettings("org-1");

    expect(httpClient.get).toHaveBeenCalledWith("/organizations/org-1/ai-settings");
    expect(result).toEqual(mockSettings);
  });

  it("setOrgProviderKey는 PUT /organizations/:orgId/ai-settings를 {provider, apiKey}로 호출한다", async () => {
    vi.mocked(httpClient.put).mockResolvedValue({ data: undefined });
    await setOrgProviderKey("org-1", "openai", "sk-test-key");
    expect(httpClient.put).toHaveBeenCalledWith("/organizations/org-1/ai-settings", { provider: "openai", apiKey: "sk-test-key" });
  });

  it("removeOrgProviderKey는 DELETE /organizations/:orgId/ai-settings/:provider를 호출한다", async () => {
    vi.mocked(httpClient.delete).mockResolvedValue({ data: undefined });
    await removeOrgProviderKey("org-1", "openai");
    expect(httpClient.delete).toHaveBeenCalledWith("/organizations/org-1/ai-settings/openai");
  });

  it("setEnabledModels는 PUT /organizations/:orgId/ai-models를 호출한다", async () => {
    vi.mocked(httpClient.put).mockResolvedValue({ data: undefined });
    await setEnabledModels("org-1", ["gpt-4o"]);
    expect(httpClient.put).toHaveBeenCalledWith("/organizations/org-1/ai-models", { enabledModels: ["gpt-4o"] });
  });

  it("getAiChatConfig는 GET /ai/chat/config/:diagramId를 호출하고 r.data를 반환한다", async () => {
    const mockConfig = { models: [{ provider: "anthropic", value: "claude-sonnet-5", label: "Claude Sonnet 5 (권장)" }] };
    vi.mocked(httpClient.get).mockResolvedValue({ data: mockConfig });

    const result = await getAiChatConfig("diag-1");

    expect(httpClient.get).toHaveBeenCalledWith("/ai/chat/config/diag-1");
    expect(result).toEqual(mockConfig);
  });

  it("getSessions는 GET /ai/sessions를 diagramId 파라미터로 호출하고 r.data를 반환한다", async () => {
    const mockSessions = [{ id: "s-1", diagramId: "diag-1", name: "대화 1", createdAt: "2026-01-01T00:00:00Z" }];
    vi.mocked(httpClient.get).mockResolvedValue({ data: mockSessions });

    const result = await getSessions("diag-1");

    expect(httpClient.get).toHaveBeenCalledWith("/ai/sessions", { params: { diagramId: "diag-1" } });
    expect(result).toEqual(mockSessions);
  });

  it("createSession은 POST /ai/sessions를 호출하고 sessionId를 반환한다", async () => {
    vi.mocked(httpClient.post).mockResolvedValue({ data: { sessionId: "new-sess" } });

    const result = await createSession("diag-1");

    expect(httpClient.post).toHaveBeenCalledWith("/ai/sessions", { diagramId: "diag-1" });
    expect(result).toEqual({ sessionId: "new-sess" });
  });

  it("getSessionMessages는 기본 limit=50으로 GET /ai/sessions/:id/messages를 호출한다", async () => {
    const mockResponse = { messages: [], hasMore: false };
    vi.mocked(httpClient.get).mockResolvedValue({ data: mockResponse });

    const result = await getSessionMessages("sess-1");

    expect(httpClient.get).toHaveBeenCalledWith("/ai/sessions/sess-1/messages", {
      params: { limit: 50 },
    });
    expect(result).toEqual(mockResponse);
  });

  it("getSessionMessages는 limit/before 옵션을 쿼리 파라미터로 전달한다", async () => {
    vi.mocked(httpClient.get).mockResolvedValue({ data: { messages: [], hasMore: true } });

    await getSessionMessages("sess-1", { limit: 20, before: "msg-10" });

    expect(httpClient.get).toHaveBeenCalledWith("/ai/sessions/sess-1/messages", {
      params: { limit: 20, before: "msg-10" },
    });
  });
});

/** 문자열 청크 배열을 순서대로 방출하는 SSE 스트림 응답을 흉내 낸다. */
const makeSseResponse = (
  chunks: string[],
  init?: { ok?: boolean; status?: number; nullBody?: boolean },
): Response => {
  const encoder = new TextEncoder();
  let index = 0;
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    body: init?.nullBody
      ? null
      : {
          getReader: () => ({
            read: () =>
              index < chunks.length
                ? Promise.resolve({ value: encoder.encode(chunks[index++]), done: false })
                : Promise.resolve({ value: undefined, done: true }),
          }),
        },
  } as unknown as Response;
};

const makeStreamOptions = (): AiChatStreamOptions & {
  onText: ReturnType<typeof vi.fn>;
  onDone: ReturnType<typeof vi.fn>;
  onError: ReturnType<typeof vi.fn>;
  onStatus: ReturnType<typeof vi.fn>;
} => ({
  diagramId: "diag-1",
  message: "테이블 추가해줘",
  sessionId: "sess-1",
  model: "claude-sonnet-5",
  onText: vi.fn(),
  onDone: vi.fn(),
  onError: vi.fn(),
  onStatus: vi.fn(),
});

describe("sendAiChatStream", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("스트림 엔드포인트에 diagramId/message/sessionId/model을 담아 POST한다", async () => {
    fetchMock.mockResolvedValue(makeSseResponse([]));
    const options = makeStreamOptions();

    await sendAiChatStream(options);

    expect(fetchMock).toHaveBeenCalledWith("http://test-api/ai/chat/stream", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        diagramId: "diag-1",
        message: "테이블 추가해줘",
        sessionId: "sess-1",
        model: "claude-sonnet-5",
      }),
    });
  });

  it("model이 빈 문자열이면 요청 body에 model 필드를 포함하지 않는다", async () => {
    fetchMock.mockResolvedValue(makeSseResponse([]));
    const options = { ...makeStreamOptions(), model: "" };

    await sendAiChatStream(options);

    const body = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(body).toEqual({ diagramId: "diag-1", message: "테이블 추가해줘", sessionId: "sess-1" });
  });

  it("event: text 블록마다 onText가 delta로 호출된다", async () => {
    fetchMock.mockResolvedValue(
      makeSseResponse([
        'event: text\ndata: {"delta":"안녕"}\n\n',
        'event: text\ndata: {"delta":"하세요"}\n\n',
      ]),
    );
    const options = makeStreamOptions();

    await sendAiChatStream(options);

    expect(options.onText).toHaveBeenNthCalledWith(1, "안녕");
    expect(options.onText).toHaveBeenNthCalledWith(2, "하세요");
    expect(options.onError).not.toHaveBeenCalled();
  });

  it("event: status 블록은 onStatus에 label을 전달한다", async () => {
    fetchMock.mockResolvedValue(
      makeSseResponse(['event: status\ndata: {"label":"스키마 분석 중"}\n\n']),
    );
    const options = makeStreamOptions();

    await sendAiChatStream(options);

    expect(options.onStatus).toHaveBeenCalledWith("스키마 분석 중");
  });

  it("onStatus가 없어도 status 이벤트에서 예외 없이 진행된다", async () => {
    fetchMock.mockResolvedValue(
      makeSseResponse([
        'event: status\ndata: {"label":"스키마 분석 중"}\n\n',
        'event: text\ndata: {"delta":"완료"}\n\n',
      ]),
    );
    const { onStatus, ...options } = makeStreamOptions();

    await expect(sendAiChatStream(options)).resolves.toBeUndefined();
    expect(options.onText).toHaveBeenCalledWith("완료");
    // 전달하지 않은 onStatus 콜백은 당연히 호출되지 않는다
    expect(onStatus).not.toHaveBeenCalled();
  });

  it("event: done 블록은 onDone에 파싱된 페이로드를 전달한다", async () => {
    const done = { messageId: "msg-1", content: "완료", diff: null, pendingDocument: null };
    fetchMock.mockResolvedValue(
      makeSseResponse([`event: done\ndata: ${JSON.stringify(done)}\n\n`]),
    );
    const options = makeStreamOptions();

    await sendAiChatStream(options);

    expect(options.onDone).toHaveBeenCalledWith(done);
  });

  it("event: error 블록은 onError에 message를 전달한다", async () => {
    fetchMock.mockResolvedValue(
      makeSseResponse(['event: error\ndata: {"message":"모델 호출 실패"}\n\n']),
    );
    const options = makeStreamOptions();

    await sendAiChatStream(options);

    expect(options.onError).toHaveBeenCalledWith("모델 호출 실패");
  });

  it("여러 줄 data: 필드는 줄바꿈으로 이어 붙여 하나의 JSON으로 파싱한다", async () => {
    fetchMock.mockResolvedValue(
      makeSseResponse(['event: text\ndata: {"delta":\ndata: "멀티라인"}\n\n']),
    );
    const options = makeStreamOptions();

    await sendAiChatStream(options);

    expect(options.onText).toHaveBeenCalledWith("멀티라인");
  });

  it("data가 없는 이벤트 블록은 무시한다", async () => {
    fetchMock.mockResolvedValue(
      makeSseResponse(["event: text\n\n", 'event: text\ndata: {"delta":"유효"}\n\n']),
    );
    const options = makeStreamOptions();

    await sendAiChatStream(options);

    expect(options.onText).toHaveBeenCalledTimes(1);
    expect(options.onText).toHaveBeenCalledWith("유효");
  });

  it("data가 JSON이 아니면 해당 블록만 무시하고 계속 진행한다", async () => {
    fetchMock.mockResolvedValue(
      makeSseResponse([
        "event: text\ndata: not-json\n\n",
        'event: text\ndata: {"delta":"정상"}\n\n',
      ]),
    );
    const options = makeStreamOptions();

    await sendAiChatStream(options);

    expect(options.onText).toHaveBeenCalledTimes(1);
    expect(options.onText).toHaveBeenCalledWith("정상");
    expect(options.onError).not.toHaveBeenCalled();
  });

  it("알 수 없는 event 타입은 어떤 콜백도 호출하지 않는다", async () => {
    fetchMock.mockResolvedValue(
      makeSseResponse(['event: unknown\ndata: {"foo":"bar"}\n\n']),
    );
    const options = makeStreamOptions();

    await sendAiChatStream(options);

    expect(options.onText).not.toHaveBeenCalled();
    expect(options.onDone).not.toHaveBeenCalled();
    expect(options.onError).not.toHaveBeenCalled();
    expect(options.onStatus).not.toHaveBeenCalled();
  });

  it("이벤트 블록이 청크 중간에서 잘려도 버퍼링해 이어서 파싱한다", async () => {
    fetchMock.mockResolvedValue(
      makeSseResponse(["event: text\nda", 'ta: {"delta":"조각"}\n', "\nevent: done\n", 'data: {"messageId":"m-1","diff":null,"pendingDocument":null}\n\n']),
    );
    const options = makeStreamOptions();

    await sendAiChatStream(options);

    expect(options.onText).toHaveBeenCalledWith("조각");
    expect(options.onDone).toHaveBeenCalledWith({ messageId: "m-1", diff: null, pendingDocument: null });
  });

  it("CRLF(\\r\\n)로 프레이밍된 스트림도 파싱한다", async () => {
    fetchMock.mockResolvedValue(
      makeSseResponse([
        'event: text\r\ndata: {"delta":"캐리지"}\r\n\r\n',
        'event: done\r\ndata: {"messageId":"m-crlf","diff":null,"pendingDocument":null}\r\n\r\n',
      ]),
    );
    const options = makeStreamOptions();

    await sendAiChatStream(options);

    expect(options.onText).toHaveBeenCalledWith("캐리지");
    expect(options.onDone).toHaveBeenCalledWith({ messageId: "m-crlf", diff: null, pendingDocument: null });
    expect(options.onError).not.toHaveBeenCalled();
  });

  it("CR(\\r)로만 프레이밍된 스트림도 파싱한다", async () => {
    fetchMock.mockResolvedValue(
      makeSseResponse([
        'event: text\rdata: {"delta":"CR프레임"}\r\r',
        'event: status\rdata: {"label":"진행 중"}\r\r',
      ]),
    );
    const options = makeStreamOptions();

    await sendAiChatStream(options);

    expect(options.onText).toHaveBeenCalledWith("CR프레임");
    expect(options.onStatus).toHaveBeenCalledWith("진행 중");
    expect(options.onError).not.toHaveBeenCalled();
  });

  it("\\r\\n이 청크 경계에서 \\r과 \\n으로 잘려도 버퍼링해 이어서 파싱한다", async () => {
    fetchMock.mockResolvedValue(
      makeSseResponse([
        // 첫 청크는 이벤트 경계(\r\n\r\n)의 첫 \r에서 끊긴다
        'event: text\r\ndata: {"delta":"경계"}\r',
        '\n\r\nevent: text\r\ndata: {"delta":"이어짐"}\r\n\r\n',
      ]),
    );
    const options = makeStreamOptions();

    await sendAiChatStream(options);

    expect(options.onText).toHaveBeenNthCalledWith(1, "경계");
    expect(options.onText).toHaveBeenNthCalledWith(2, "이어짐");
    expect(options.onError).not.toHaveBeenCalled();
  });

  it("HTTP 응답이 ok가 아니면 onError를 호출하고 스트림을 읽지 않는다", async () => {
    fetchMock.mockResolvedValue(makeSseResponse([], { ok: false, status: 500 }));
    const options = makeStreamOptions();

    await sendAiChatStream(options);

    expect(options.onError).toHaveBeenCalledWith("HTTP error: 500");
    expect(options.onText).not.toHaveBeenCalled();
    expect(options.onDone).not.toHaveBeenCalled();
  });

  it("응답 body가 null이면 onError를 호출한다", async () => {
    fetchMock.mockResolvedValue(makeSseResponse([], { ok: true, status: 200, nullBody: true }));
    const options = makeStreamOptions();

    await sendAiChatStream(options);

    expect(options.onError).toHaveBeenCalledWith("HTTP error: 200");
  });
});
