import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { SchedulerRegistry } from "@nestjs/schedule";
import { ErrorReportsService } from "./error-reports.service";
import { ErrorReport } from "@erdify/db";
import { EmailService } from "../email/email.service";

const mockRepo = () => ({
  save: vi.fn(),
  find: vi.fn().mockResolvedValue([]),
  createQueryBuilder: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    addSelect: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    getRawMany: vi.fn().mockResolvedValue([]),
    getCount: vi.fn().mockResolvedValue(0),
  }),
  update: vi.fn(),
  count: vi.fn().mockResolvedValue(0),
});

const mockEmail = () => ({ sendErrorAlertEmail: vi.fn().mockResolvedValue(true), sendSpikeAlertEmail: vi.fn().mockResolvedValue(true) });
const mockConfig = () => ({ get: vi.fn((key: string, def: unknown) => def) });
const mockScheduler = () => ({ addCronJob: vi.fn(), getCronJob: vi.fn() });

describe("ErrorReportsService", () => {
  let service: ErrorReportsService;
  let repo: ReturnType<typeof mockRepo>;
  let email: ReturnType<typeof mockEmail>;

  beforeEach(async () => {
    repo = mockRepo();
    email = mockEmail();
    const module = await Test.createTestingModule({
      providers: [
        ErrorReportsService,
        { provide: getRepositoryToken(ErrorReport), useValue: repo },
        { provide: EmailService, useValue: email },
        { provide: ConfigService, useValue: mockConfig() },
        { provide: SchedulerRegistry, useValue: mockScheduler() },
      ],
    }).compile();
    service = module.get(ErrorReportsService);
  });

  it("saves error report to DB", async () => {
    await service.create({
      errorType: "5xx", httpStatus: 500,
      path: "/api/test", url: "http://app/test",
      userId: "u1", userAgent: "Chrome",
    });
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ errorType: "5xx", httpStatus: 500 }),
    );
  });

  it("sends email for 5xx errors", async () => {
    await service.create({
      errorType: "5xx", httpStatus: 500,
      path: "/api/test", url: "http://app/test",
      userId: null, userAgent: "Chrome",
    });
    expect(email.sendErrorAlertEmail).toHaveBeenCalled();
  });

  it("sends email for network errors", async () => {
    await service.create({
      errorType: "network", httpStatus: null,
      path: "/api/test", url: "http://app/test",
      userId: null, userAgent: "Chrome",
    });
    expect(email.sendErrorAlertEmail).toHaveBeenCalled();
  });

  it("does NOT send email for 403 errors", async () => {
    await service.create({
      errorType: "403", httpStatus: 403,
      path: "/api/test", url: "http://app/test",
      userId: null, userAgent: "Chrome",
    });
    expect(email.sendErrorAlertEmail).not.toHaveBeenCalled();
  });

  it("does NOT send email for 404 errors", async () => {
    await service.create({
      errorType: "404", httpStatus: 404,
      path: "/api/test", url: "http://app/test",
      userId: null, userAgent: "Chrome",
    });
    expect(email.sendErrorAlertEmail).not.toHaveBeenCalled();
  });

  it("resolves matching reports", async () => {
    await service.resolve({ path: "/api/test", errorType: "5xx", resolvedById: "admin-1", note: "fixed" });
    expect(repo.update).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/test", errorType: "5xx" }),
      expect.objectContaining({ resolvedBy: "admin-1" }),
    );
  });

  it("saves new context fields to DB when provided", async () => {
    await service.create({
      errorType: "5xx", httpStatus: 500,
      path: "/api/test", url: "http://app/test",
      userId: "u1", userAgent: "Chrome",
      pageName: "다이어그램 편집",
      requestMethod: "POST",
      requestBody: '{"title":"My Diagram"}',
      requestParams: null,
      responseBody: '{"message":"Internal server error"}',
    });
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        pageName: "다이어그램 편집",
        requestMethod: "POST",
        requestBody: '{"title":"My Diagram"}',
        responseBody: '{"message":"Internal server error"}',
      }),
    );
  });

  it("getOccurrences returns records for given errorType and path", async () => {
    const mockRecords = [
      { id: "1", errorType: "5xx", path: "/api/test", createdAt: new Date(), userId: "u1", pageName: "대시보드", url: "http://app", requestMethod: "GET", requestBody: null, requestParams: null, responseBody: null, userAgent: "Chrome", httpStatus: 500, resolvedAt: null, resolvedBy: null, resolvedNote: null },
    ];
    repo.find.mockResolvedValue(mockRecords);
    const result = await service.getOccurrences("5xx", "/api/test");
    expect(repo.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { errorType: "5xx", path: "/api/test" }, order: { createdAt: "DESC" } }),
    );
    expect(result).toEqual(mockRecords);
  });
});
