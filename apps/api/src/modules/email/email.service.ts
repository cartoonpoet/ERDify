import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

export interface InviteEmailParams {
  to: string;
  orgName: string;
  inviterName: string;
  role: string;
  inviteUrl: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    const smtpUser = config.get<string>("SMTP_USER", "");
    const auth = smtpUser
      ? { user: smtpUser, pass: config.get<string>("SMTP_PASS", "") }
      : undefined;

    this.transporter = nodemailer.createTransport({
      host: config.get<string>("SMTP_HOST", "localhost"),
      port: config.get<number>("SMTP_PORT", 587),
      secure: config.get<string>("SMTP_SECURE", "false") === "true",
      auth,
    });
  }

  async sendInviteEmail(params: InviteEmailParams): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.config.get<string>("SMTP_FROM", "noreply@erdify.app"),
        to: params.to,
        subject: `[ERDify] ${params.orgName} 조직에 초대되었습니다`,
        html: `
          <p>안녕하세요,</p>
          <p><strong>${params.inviterName}</strong>님이 <strong>${params.orgName}</strong> 조직에
          <strong>${params.role}</strong> 역할로 초대하셨습니다.</p>
          <p><a href="${params.inviteUrl}" style="background:#0064E0;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">ERDify에 가입하고 합류하기</a></p>
          <p style="color:#999;font-size:12px;">이 초대는 7일 후 만료됩니다.</p>
        `,
      });
    } catch (err) {
      this.logger.warn(`Failed to send invite email to ${params.to}: ${(err as Error).message}`);
    }
  }
}
