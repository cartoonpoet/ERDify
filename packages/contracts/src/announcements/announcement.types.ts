export type AnnouncementType = 'maintenance' | 'error' | 'feature' | 'general';

export interface AnnouncementResponse {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  isUrgent: boolean;
  startsAt: string;
  endsAt: string | null;
  createdAt: string;
}

export interface CreateAnnouncementDto {
  title: string;
  content: string;
  type: AnnouncementType;
  isUrgent: boolean;
  startsAt: string;
  endsAt?: string | null;
}

export interface UpdateAnnouncementDto {
  title?: string;
  content?: string;
  type?: AnnouncementType;
  isUrgent?: boolean;
  startsAt?: string;
  endsAt?: string | null;
}

export interface AiGenerateAnnouncementDto {
  type: AnnouncementType;
  keywords: string;
}

export interface AiRefineAnnouncementDto {
  title: string;
  content: string;
}

export interface AiAnnouncementResult {
  title: string;
  content: string;
}
