import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/queryKeys";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import type { AnnouncementResponse, CreateAnnouncementDto } from "@erdify/contracts";
import {
  adminListAnnouncements, adminCreateAnnouncement,
  adminUpdateAnnouncement, adminDeleteAnnouncement,
} from "@/shared/api/admin-announcements.api";
import { AnnouncementForm } from "../components/AnnouncementForm";
import { Button } from "@/shared/components/Button";
import * as css from "./announcements-admin-page.css";

const TYPE_LABEL: Record<string, string> = {
  maintenance: "🛠️ 점검", error: "🔴 오류", feature: "✨ 신규 기능", general: "📢 공지",
};

const isActive = (a: AnnouncementResponse) => {
  const now = new Date();
  return new Date(a.startsAt) <= now && (!a.endsAt || new Date(a.endsAt) > now);
};

export const AnnouncementsAdminPage = () => {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AnnouncementResponse | undefined>();

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: queryKeys.adminAnnouncements(),
    queryFn: adminListAnnouncements,
  });

  const createMut = useMutation({
    mutationFn: adminCreateAnnouncement,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.adminAnnouncements() }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: CreateAnnouncementDto }) =>
      adminUpdateAnnouncement(id, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.adminAnnouncements() }),
  });

  const deleteMut = useMutation({
    mutationFn: adminDeleteAnnouncement,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.adminAnnouncements() }),
  });

  const handleSubmit = async (dto: CreateAnnouncementDto) => {
    if (editing) {
      await updateMut.mutateAsync({ id: editing.id, dto });
    } else {
      await createMut.mutateAsync(dto);
    }
  };

  return (
    <div className={css.page}>
      <div className={css.pageHeader}>
        <span className={css.pageTitle}>공지 관리</span>
        <Button variant="primary" size="md" onClick={() => { setEditing(undefined); setFormOpen(true); }}>
          + 새 공지 작성
        </Button>
      </div>

      <div className={css.listArea}>
        {isLoading && <div style={{ color: "var(--text-2)", fontSize: "13px" }}>불러오는 중...</div>}
        {!isLoading && announcements.length === 0 && (
          <div className={css.emptyState}>📭 등록된 공지가 없습니다.</div>
        )}
        {announcements.map((a) => (
          <div key={a.id} className={css.announcementCard}>
            <div className={css.cardTop}>
              <span className={css.cardTitle}>{a.title}</span>
              {isActive(a)
                ? <span className={css.activeBadge}>활성</span>
                : <span className={css.expiredBadge}>만료</span>}
              {a.isUrgent && <span className={css.urgentBadge}>긴급</span>}
            </div>
            <div className={css.cardMeta}>
              <span>{TYPE_LABEL[a.type]}</span>
              <span>·</span>
              <span>{formatDistanceToNow(new Date(a.startsAt), { addSuffix: true, locale: ko })} 시작</span>
              {a.endsAt && <><span>·</span><span>{formatDistanceToNow(new Date(a.endsAt), { addSuffix: true, locale: ko })} 종료</span></>}
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-2)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{a.content}</div>
            <div className={css.cardActions}>
              <button className={css.actionBtn} onClick={() => { setEditing(a); setFormOpen(true); }}>수정</button>
              <button
                className={css.deleteBtn}
                onClick={() => {
                  if (window.confirm(`"${a.title}" 공지를 삭제하시겠습니까?`)) {
                    deleteMut.mutate(a.id);
                  }
                }}
              >
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>

      <AnnouncementForm
        key={editing?.id ?? "new"}
        open={formOpen}
        initial={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
};
