import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AnnouncementResponse } from "@erdify/contracts";
import { getActiveAnnouncements } from "@/shared/api/announcements.api";
import { queryKeys } from "@/shared/lib/queryKeys";

const STORAGE_KEY = "seen_announcements";

const getSeenIds = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
};

const persistSeenIds = (ids: string[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
};

export const useAnnouncements = () => {
  const [seenIds, setSeenIds] = useState<string[]>(getSeenIds);

  const { data: announcements = [] } = useQuery({
    queryKey: queryKeys.announcementsActive(),
    queryFn: getActiveAnnouncements,
    staleTime: 5 * 60 * 1000,
  });

  const unread = announcements.filter(
    (a: AnnouncementResponse) => a.isUrgent || !seenIds.includes(a.id),
  );

  const markSeen = (id: string) => {
    const next = Array.from(new Set([...seenIds, id]));
    persistSeenIds(next);
    setSeenIds(next);
  };

  const markAllSeen = () => {
    const next = Array.from(new Set([...seenIds, ...unread.map((a) => a.id)]));
    persistSeenIds(next);
    setSeenIds(next);
  };

  return { unread, markSeen, markAllSeen };
};
