import { Injectable, Logger } from "@nestjs/common";
import type { AiGenerateAnnouncementDto, AiRefineAnnouncementDto, AiAnnouncementResult, AnnouncementType } from "@erdify/contracts";
import { AiService } from "../ai/ai.service";

const TONE_GUIDE: Record<AnnouncementType, string> = {
  maintenance: "정중하고 명확한 안내 어조. 일시, 영향 범위, 조치 방법 순으로 구성한다.",
  error: "진심 어린 사과로 시작하고, 현황과 복구 일정을 간결하게 전달한다.",
  feature: "기능의 혜택을 중심으로 밝고 친근한 어조로 작성한다.",
  general: "중립적이고 정중한 어조로 작성한다.",
};

@Injectable()
export class AnnouncementsAiService {
  private readonly logger = new Logger(AnnouncementsAiService.name);

  constructor(private readonly aiService: AiService) {}

  async generate(dto: AiGenerateAnnouncementDto, userId: string): Promise<AiAnnouncementResult> {
    const tone = TONE_GUIDE[dto.type];
    const prompt = `당신은 SaaS 서비스의 공지사항 작성 전문가입니다.
아래 키워드를 바탕으로 서비스 공지사항을 작성해주세요.

타입: ${dto.type}
어조 가이드: ${tone}
핵심 내용: ${dto.keywords}

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요.
{"title": "공지 제목 (50자 이내)", "content": "공지 내용 (존댓말, 2-4문장)"}`;

    return this.callAndParse(prompt, dto.keywords, userId);
  }

  async refine(dto: AiRefineAnnouncementDto, userId: string): Promise<AiAnnouncementResult> {
    const prompt = `당신은 SaaS 서비스의 공지사항 편집 전문가입니다.
아래 공지사항의 내용은 그대로 유지하면서, 가독성(문장 길이, 존댓말 통일, 핵심 강조)만 개선해주세요.

원본 제목: ${dto.title}
원본 내용: ${dto.content}

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요.
{"title": "개선된 제목", "content": "개선된 내용"}`;

    return this.callAndParse(prompt, dto.title, userId);
  }

  /** 어드민이 속한 조직에 등록된 AI 키로 생성한다. 실패 시 빈 내용으로 안전하게 fallback. */
  private async callAndParse(prompt: string, fallbackLabel: string, userId: string): Promise<AiAnnouncementResult> {
    try {
      const text = await this.aiService.completeForUser(userId, prompt, 512);
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]) as { title?: string; content?: string };
        if (parsed.title && parsed.content) {
          return { title: parsed.title, content: parsed.content };
        }
      }
    } catch (e) {
      this.logger.error("AI announcement generation failed", e);
    }
    return { title: fallbackLabel, content: "" };
  }
}
