import type { AnnouncementResponse } from "@erdify/contracts";
import { httpClient } from "./httpClient";

export const getActiveAnnouncements = (): Promise<AnnouncementResponse[]> =>
  httpClient.get<AnnouncementResponse[]>("/announcements/active").then((r) => r.data);
