import type { AnnouncementResponse, AnnouncementType } from "@erdify/contracts";
import * as css from "./AnnouncementSlide.css";

const TAG_LABEL: Record<AnnouncementType, string> = {
  maintenance: "🛠️ 점검 안내",
  error: "🔴 오류 공지",
  feature: "✨ 신규 기능",
  general: "📢 공지",
};

const TAG_CLASS: Record<AnnouncementType, string> = {
  maintenance: css.tagMaintenance,
  error: css.tagError,
  feature: css.tagFeature,
  general: css.tagGeneral,
};

interface AnnouncementSlideProps {
  announcement: AnnouncementResponse;
}

export const AnnouncementSlide = ({ announcement }: AnnouncementSlideProps) => (
  <div className={css.root}>
    <span className={`${css.tag} ${TAG_CLASS[announcement.type]}`}>
      {TAG_LABEL[announcement.type]}
    </span>
    <div className={css.slideTitle}>{announcement.title}</div>
    <div className={css.slideBody}>{announcement.content}</div>
    {announcement.isUrgent && (
      <div className={css.urgentNote}>⚠ 긴급 공지입니다. 내용을 반드시 확인해주세요.</div>
    )}
  </div>
);
