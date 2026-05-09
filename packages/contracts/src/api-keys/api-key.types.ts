export interface ApiKeyItem {
  id: string;
  name: string | null;
  prefix: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface ApiKeyCreated {
  apiKey: string;
  id: string;
  name: string | null;
  prefix: string;
  expiresAt: string | null;
  createdAt: string;
}
