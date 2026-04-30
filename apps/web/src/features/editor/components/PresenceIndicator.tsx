import type { Collaborator } from "../hooks/useRealtimeCollaboration";

interface Props {
  collaborators: Collaborator[];
}

export function PresenceIndicator({ collaborators }: Props) {
  if (collaborators.length === 0) return null;

  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {collaborators.map((c) => (
        <div
          key={c.userId}
          title={c.userId}
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: c.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            cursor: "default",
            flexShrink: 0,
            outline: c.selectedEntityId ? `2px solid ${c.color}` : "none",
            outlineOffset: 2
          }}
        >
          {c.userId.charAt(0).toUpperCase()}
        </div>
      ))}
    </div>
  );
}
