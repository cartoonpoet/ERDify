import { useState } from "react";
import { Modal } from "../../../design-system/Modal";
import { addColumn, addRelationship } from "@erdify/domain";
import type { DiagramRelationship } from "@erdify/domain";
import { useEditorStore } from "../stores/useEditorStore";
import type { PendingConnection } from "../stores/useEditorStore";
import * as css from "./fk-setup-modal.css";

const toSnake = (s: string) =>
  s.replace(/\s+/g, "_").replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();

type ColInput = { mode: "new"; name: string } | { mode: "existing"; colId: string };

const Inner = ({ pending }: { pending: PendingConnection }) => {
  const document = useEditorStore((s) => s.document);
  const applyCommand = useEditorStore((s) => s.applyCommand);
  const setPendingConnection = useEditorStore((s) => s.setPendingConnection);

  const [inputs, setInputs] = useState<ColInput[]>(
    pending.unmatchedPks.map((pk) => ({ mode: "new" as const, name: pk.suggestedName }))
  );

  if (!document) return null;

  const sourceEntity = document.entities.find((e) => e.id === pending.sourceEntityId);
  const targetEntity = document.entities.find((e) => e.id === pending.targetEntityId);
  if (!sourceEntity || !targetEntity) return null;

  const setMode = (i: number, mode: "new" | "existing") => {
    setInputs((prev) =>
      prev.map((inp, j) => {
        if (j !== i) return inp;
        if (mode === "new") return { mode: "new", name: pending.unmatchedPks[i]?.suggestedName ?? "" };
        return { mode: "existing", colId: sourceEntity.columns[0]?.id ?? "" };
      })
    );
  };

  const setName = (i: number, name: string) => {
    setInputs((prev) =>
      prev.map((inp, j) => (j === i ? { mode: "new" as const, name } : inp))
    );
  };

  const setColId = (i: number, colId: string) => {
    setInputs((prev) =>
      prev.map((inp, j) => (j === i ? { mode: "existing" as const, colId } : inp))
    );
  };

  const handleConfirm = () => {
    applyCommand((doc) => {
      let next = doc;
      const fkColIds: string[] = pending.autoMatchedCols.map((m) => m.fkColId);
      const pkColIds: string[] = pending.autoMatchedCols.map((m) => m.pkColId);

      pending.unmatchedPks.forEach((pk, i) => {
        const inp = inputs[i];
        if (!inp) return;

        if (inp.mode === "new") {
          const colId = crypto.randomUUID();
          fkColIds.push(colId);
          if (pk.pkColId) pkColIds.push(pk.pkColId);
          const srcEntity = next.entities.find((e) => e.id === pending.sourceEntityId)!;
          next = addColumn(next, pending.sourceEntityId, {
            id: colId,
            name: inp.name.trim() || pk.suggestedName,
            type: pk.pkColType,
            nullable: true,
            primaryKey: false,
            unique: false,
            defaultValue: null,
            comment: null,
            ordinal: srcEntity.columns.length,
          });
        } else {
          fkColIds.push(inp.colId);
          if (pk.pkColId) pkColIds.push(pk.pkColId);
        }
      });

      const srcName = toSnake(next.entities.find((e) => e.id === pending.sourceEntityId)!.name);
      const tgtName = toSnake(next.entities.find((e) => e.id === pending.targetEntityId)!.name);

      const relationship: DiagramRelationship = {
        id: crypto.randomUUID(),
        name: `fk_${srcName}_${tgtName}`,
        sourceEntityId: pending.sourceEntityId,
        sourceColumnIds: fkColIds,
        targetEntityId: pending.targetEntityId,
        targetColumnIds: pkColIds,
        cardinality: "many-to-one",
        onDelete: "no-action",
        onUpdate: "no-action",
        identifying: false,
      };

      return addRelationship(next, relationship);
    });

    setPendingConnection(null);
  };

  return (
    <div className={css.body}>
      <p className={css.description}>
        <strong>{sourceEntity.name}</strong> 테이블에 FK 컬럼을 추가합니다.
        (<strong>{targetEntity.name}</strong> 참조)
      </p>

      {pending.unmatchedPks.map((pk, i) => {
        const inp = inputs[i];
        if (!inp) return null;
        return (
          <div key={pk.pkColId || `nopk-${i}`} className={css.pkRow}>
            <div className={css.pkLabel}>
              {pk.pkColId ? `${pk.pkColName} (${pk.pkColType})` : `참조 ID (${pk.pkColType})`}
            </div>
            <div className={css.modeRow}>
              <label className={css.radioLabel}>
                <input
                  type="radio"
                  checked={inp.mode === "new"}
                  onChange={() => setMode(i, "new")}
                />
                새 컬럼
              </label>
              {inp.mode === "new" && (
                <input
                  className={css.textInput}
                  value={inp.name}
                  onChange={(e) => setName(i, e.target.value)}
                  autoFocus={i === 0}
                />
              )}
            </div>
            {sourceEntity.columns.length > 0 && (
              <div className={css.modeRow}>
                <label className={css.radioLabel}>
                  <input
                    type="radio"
                    checked={inp.mode === "existing"}
                    onChange={() => setMode(i, "existing")}
                  />
                  기존 컬럼
                </label>
                {inp.mode === "existing" && (
                  <select
                    className={css.colSelect}
                    value={inp.colId}
                    onChange={(e) => setColId(i, e.target.value)}
                  >
                    {sourceEntity.columns.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.name} ({col.type})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div className={css.footer}>
        <button className={css.cancelBtn} onClick={() => setPendingConnection(null)}>
          취소
        </button>
        <button className={css.confirmBtn} onClick={handleConfirm}>
          관계 생성
        </button>
      </div>
    </div>
  );
};

export const FkSetupModal = () => {
  const pendingConnection = useEditorStore((s) => s.pendingConnection);
  const setPendingConnection = useEditorStore((s) => s.setPendingConnection);

  const key = pendingConnection
    ? `${pendingConnection.sourceEntityId}-${pendingConnection.targetEntityId}`
    : "";

  return (
    <Modal
      open={pendingConnection !== null}
      onClose={() => setPendingConnection(null)}
      title="FK 컬럼 설정"
    >
      {pendingConnection && <Inner key={key} pending={pendingConnection} />}
    </Modal>
  );
};
