import type {
  AnnouncementResponse,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  AiGenerateAnnouncementDto,
  AiRefineAnnouncementDto,
  AiAnnouncementResult,
} from "@erdify/contracts";
import { httpClient } from "./httpClient";

export const adminListAnnouncements = (): Promise<AnnouncementResponse[]> =>
  httpClient.get<AnnouncementResponse[]>("/admin/announcements").then((r) => r.data);

export const adminCreateAnnouncement = (body: CreateAnnouncementDto): Promise<AnnouncementResponse> =>
  httpClient.post<AnnouncementResponse>("/admin/announcements", body).then((r) => r.data);

export const adminUpdateAnnouncement = (id: string, body: UpdateAnnouncementDto): Promise<AnnouncementResponse> =>
  httpClient.patch<AnnouncementResponse>(`/admin/announcements/${id}`, body).then((r) => r.data);

export const adminDeleteAnnouncement = (id: string): Promise<void> =>
  httpClient.delete(`/admin/announcements/${id}`).then(() => undefined);

export const adminAiGenerate = (body: AiGenerateAnnouncementDto): Promise<AiAnnouncementResult> =>
  httpClient.post<AiAnnouncementResult>("/admin/announcements/ai/generate", body).then((r) => r.data);

export const adminAiRefine = (body: AiRefineAnnouncementDto): Promise<AiAnnouncementResult> =>
  httpClient.post<AiAnnouncementResult>("/admin/announcements/ai/refine", body).then((r) => r.data);
