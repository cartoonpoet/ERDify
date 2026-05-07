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
          <div style="background:#f1f4f7;padding:40px 16px;font-family:'Helvetica Neue',Arial,sans-serif;">
            <div style="background:#fff;border:1px solid #dee3e9;border-radius:8px;overflow:hidden;max-width:480px;margin:0 auto;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
              <div style="background:linear-gradient(135deg,#0143B5 0%,#0064E0 50%,#3d8ef0 100%);padding:36px 32px;text-align:center;">
                <span style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-1px;">ERDify</span>
                <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:8px 0 0;">팀 초대가 도착했습니다</p>
              </div>
              <div style="padding:32px;">
                <p style="color:#1c2b33;font-size:14px;line-height:1.7;margin:0 0 24px;">
                  <strong>${params.inviterName}</strong>님이 <strong>${params.orgName}</strong> 조직에<br>
                  <strong>${params.role}</strong> 역할로 초대하셨습니다.
                </p>
                <div style="text-align:center;">
                  <a href="${params.inviteUrl}" style="background:#0064E0;color:#fff;padding:13px 32px;border-radius:100px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block;">초대 수락하기 →</a>
                </div>
                <p style="color:#bcc0c4;font-size:12px;text-align:center;margin:20px 0 0;">이 초대는 7일 후 만료됩니다.</p>
              </div>
            </div>
          </div>
        `,
      });
    } catch (err) {
      this.logger.warn(`Failed to send invite email to ${params.to}: ${(err as Error).message}`);
    }
  }
}
