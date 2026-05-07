import * as nodemailer from "nodemailer";
import type { ConfigService } from "@nestjs/config";
import { EmailService } from "./email.service";

vi.mock("nodemailer");

const mockSendMail = vi.fn();
const mockCreateTransport = vi.mocked(nodemailer.createTransport);

describe("EmailService", () => {
  let service: EmailService;
  let configService: { get: ReturnType<typeof vi.fn> };

  const defaultParams = {
    to: "invitee@example.com",
    orgName: "Acme Corp",
    inviterName: "Alice",
    role: "editor",
    inviteUrl: "https://erdify.app/invite/abc123",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockCreateTransport.mockReturnValue({
      sendMail: mockSendMail,
    } as unknown as nodemailer.Transporter);

    mockSendMail.mockResolvedValue({ messageId: "test-message-id" });

    configService = {
      get: vi.fn((key: string, defaultVal?: unknown) => {
        const config: Record<string, unknown> = {
          SMTP_USER: "smtp@example.com",
          SMTP_PASS: "secret",
          SMTP_HOST: "smtp.example.com",
          SMTP_PORT: 587,
          SMTP_SECURE: "false",
          SMTP_FROM: "noreply@erdify.app",
        };
        return config[key] ?? defaultVal;
      }),
    };

    service = new EmailService(configService as unknown as ConfigService);
  });

  describe("constructor", () => {
    it("creates transporter with auth when SMTP_USER is set", () => {
      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: "smtp.example.com",
          port: 587,
          secure: false,
          auth: { user: "smtp@example.com", pass: "secret" },
        })
      );
    });

    it("creates transporter without auth when SMTP_USER is empty", () => {
      vi.clearAllMocks();
      mockCreateTransport.mockReturnValue({
        sendMail: mockSendMail,
      } as unknown as nodemailer.Transporter);

      const noAuthConfig = {
        get: vi.fn((key: string, defaultVal?: unknown) => {
          const config: Record<string, unknown> = {
            SMTP_USER: "",
            SMTP_PASS: "",
            SMTP_HOST: "localhost",
            SMTP_PORT: 587,
            SMTP_SECURE: "false",
          };
          return config[key] ?? defaultVal;
        }),
      };

      new EmailService(noAuthConfig as unknown as ConfigService);

      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          auth: undefined,
        })
      );
    });
  });

  describe("sendInviteEmail", () => {
    it("calls transporter.sendMail with correct recipient", async () => {
      await service.sendInviteEmail(defaultParams);

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "invitee@example.com",
        })
      );
    });

    it("sends email with correct from address from config", async () => {
      await service.sendInviteEmail(defaultParams);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "noreply@erdify.app",
        })
      );
    });

    it("includes orgName in subject", async () => {
      await service.sendInviteEmail(defaultParams);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining("Acme Corp"),
        })
      );
    });

    it("includes inviteUrl in html body", async () => {
      await service.sendInviteEmail(defaultParams);

      const callArgs = mockSendMail.mock.calls[0]![0] as { html: string };
      expect(callArgs.html).toContain("https://erdify.app/invite/abc123");
    });

    it("includes inviterName in html body", async () => {
      await service.sendInviteEmail(defaultParams);

      const callArgs = mockSendMail.mock.calls[0]![0] as { html: string };
      expect(callArgs.html).toContain("Alice");
    });

    it("includes role in html body", async () => {
      await service.sendInviteEmail(defaultParams);

      const callArgs = mockSendMail.mock.calls[0]![0] as { html: string };
      expect(callArgs.html).toContain("editor");
    });

    it("logs warn and does not throw when sendMail fails", async () => {
      const warnSpy = vi.spyOn(service["logger"], "warn");
      mockSendMail.mockRejectedValue(new Error("SMTP connection refused"));

      await expect(service.sendInviteEmail(defaultParams)).resolves.toBeUndefined();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("invitee@example.com")
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("SMTP connection refused")
      );
    });

    it("uses default SMTP_FROM when config key is absent", async () => {
      vi.clearAllMocks();
      mockCreateTransport.mockReturnValue({
        sendMail: mockSendMail,
      } as unknown as nodemailer.Transporter);
      mockSendMail.mockResolvedValue({});

      const minimalConfig = {
        get: vi.fn((key: string, defaultVal?: unknown) => {
          if (key === "SMTP_USER") return "user@test.com";
          return defaultVal;
        }),
      };

      const minimalService = new EmailService(minimalConfig as unknown as ConfigService);
      await minimalService.sendInviteEmail(defaultParams);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "noreply@erdify.app",
        })
      );
    });
  });
});
