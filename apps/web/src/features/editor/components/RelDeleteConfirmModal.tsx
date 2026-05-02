import { Modal } from "../../../design-system/Modal";
import { removeRelationship, removeColumn } from "@erdify/domain";
import { useEditorStore } from "../stores/useEditorStore";
import * as css from "./invite-modal.css";

export const RelDeleteConfirmModal = () => {
  const pendingRelDelete = useEditorStore((s) => s.pendingRelDelete);
  const setPendingRelDelete = useEditorStore((s) => s.setPendingRelDelete);
  const applyCommand = useEditorStore((s) => s.applyCommand);

  const onClose = () => setPendingRelDelete(null);

  const onDeleteRelOnly = () => {
    if (!pendingRelDelete) return;
    applyCommand((doc) => removeRelationship(doc, pendingRelDelete.relId));
    setPendingRelDelete(null);
  };

  const onDeleteAll = () => {
    if (!pendingRelDelete) return;
    applyCommand((doc) => {
      let next = removeRelationship(doc, pendingRelDelete.relId);
      for (const colId of pendingRelDelete.fkColIds) {
        next = removeColumn(next, pendingRelDelete.srcEntityId, colId);
      }
      return next;
    });
    setPendingRelDelete(null);
  };

  return (
    <Modal open={pendingRelDelete !== null} onClose={onClose} title="관계 삭제">
      {pendingRelDelete && (
        <div className={css.body}>
          <p style={{ margin: 0, fontSize: "13px", color: "#1C2B33" }}>
            FK 컬럼도 함께 삭제하시겠습니까?
          </p>
          <p style={{ margin: 0, fontSize: "12px", color: "#5D6C7B" }}>
            컬럼: {pendingRelDelete.fkColNames.join(", ")}
          </p>
          <div className={css.footer}>
            <button className={css.cancelBtn} onClick={onClose}>
              취소
            </button>
            <button className={css.cancelBtn} onClick={onDeleteRelOnly}>
              관계만 삭제
            </button>
            <button
              style={{
                padding: "6px 16px",
                background: "#E41E3F",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "13px",
              }}
              onClick={onDeleteAll}
            >
              관계 + FK 컬럼 삭제
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
