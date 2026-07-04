import type { DiagramColumn } from "@erdify/domain";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import { useColumnGlow } from "./useColumnGlow";
import * as css from "./editable-table-node.css";

interface RoColumnRowProps {
  col: DiagramColumn;
}

export const RoColumnRow = ({ col }: RoColumnRowProps) => {
  const fkColumnIds = useEditorStore((s) => s.fkColumnIds);
  const { glowClassName, onGlowAnimationEnd } = useColumnGlow(col.id);

  return (
    <li
      className={[css.roColRow, glowClassName].join(" ")}
      onAnimationEnd={onGlowAnimationEnd}
    >
      <div className={css.roBadgeCell}>
        {col.primaryKey && <span className={css.roPkBadge}>PK</span>}
      </div>
      <div className={css.roFkCell}>
        {fkColumnIds.has(col.id) && (
          <span className={css.fkDot} aria-label="FK" title="Foreign Key" />
        )}
      </div>
      <div className={css.roNullableCell}>
        {col.nullable && <span className={css.roNullableText}>?</span>}
      </div>
      <div className={css.roBadgeCell}>
        {col.unique && !col.primaryKey && <span className={css.roUqBadge}>UQ</span>}
      </div>
      <div className={css.roBadgeCell}>
        {col.autoIncrement && <span className={css.roAiBadge}>AI</span>}
      </div>
      <div className={css.roLogicalNameCell}>{col.comment ?? ""}</div>
      <div className={css.roColumnNameCell}>{col.name}</div>
      <div className={css.roTypeCell}>{col.type}</div>
    </li>
  );
};
