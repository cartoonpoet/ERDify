export type ModelBadgeVariant = "blue" | "purple" | "green" | "gray";

export const parseModelLabel = (label: string): { name: string; badge: string | null } => {
  const m = label.match(/^(.*?)\s*\((.+)\)$/);
  return m ? { name: m[1] ?? label, badge: m[2] ?? null } : { name: label, badge: null };
};

export const getBadgeVariant = (badge: string | null): ModelBadgeVariant => {
  if (badge === "권장") return "blue";
  if (badge === "고성능") return "purple";
  if (badge === "저비용" || badge === "경량") return "green";
  return "gray";
};
