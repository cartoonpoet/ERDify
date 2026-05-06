import { useEditorStore } from "../stores/useEditorStore";
import * as css from "./presence-indicator.css";

export const PresenceIndicator = () => {
  const collaborators = useEditorStore((s) => s.collaborators);
  const document = useEditorStore((s) => s.document);

  if (collaborators.length === 0) return null;

  function getEntityName(entityId: string | null): string | null {
    if (!entityId || !document) return null;
    return document.entities.find((e) => e.id === entityId)?.name ?? null;
  }

  function getInitial(email: string): string {
    return (email.split("@")[0]?.[0] ?? "?").toUpperCase();
  }

  return (
    <div className={css.list}>
      {collaborators.map((c) => {
        const entityName = getEntityName(c.selectedEntityId);

        return (
          <div key={c.userId} className={css.avatarWrapper}>
            <div
              className={css.avatar}
              title={entityName ? `${c.email} — ${entityName} 편집 중` : c.email}
              style={{
                background: c.color,
                outline: c.selectedEntityId ? `2px solid ${c.color}` : "none",
                outlineOffset: "2px",
              }}
            >
              {getInitial(c.email)}
            </div>

            <div className={css.tooltip}>
              <div className={css.tooltipName}>{c.email}</div>
              {entityName && (
                <div className={css.tooltipEntity}>{entityName} 편집 중</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
