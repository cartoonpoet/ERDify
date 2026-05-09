import type { DiagramDocument } from "@erdify/domain";

export type SharePreset = "1h" | "1d" | "7d" | "30d";

export interface DiagramResponse {
  id: string;
  projectId: string;
  organizationId: string;
  name: string;
  content: DiagramDocument;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  myRole: "owner" | "editor" | "viewer";
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
