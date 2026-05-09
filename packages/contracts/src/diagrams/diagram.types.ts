import type { DiagramDocument } from "@erdify/domain";
import type { MemberRoleType } from "../members/member.types";

export type SharePreset = "1h" | "1d" | "7d" | "30d";

export interface DiagramResponse {
  id: string;
  projectId: string;
  organizationId: string;
  organizationName: string;
  projectName: string;
  name: string;
  content: DiagramDocument;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  myRole: MemberRoleType;
  shareToken: string | null;
  shareExpiresAt: string | null;
}

export interface DiagramVersionResponse {
  id: string;
  diagramId: string;
  content: DiagramDocument;
  revision: number;
  createdBy: string;
  createdAt: string;
}

export interface ShareLinkResponse {
  shareToken: string;
  expiresAt: string;
}

export interface PublicDiagramResponse {
  id: string;
  name: string;
  content: DiagramDocument;
}
