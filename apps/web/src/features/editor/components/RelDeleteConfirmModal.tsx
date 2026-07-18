import { Modal } from "@/shared/components/Modal";
import { removeRelationship, removeColumn } from "@erdify/domain";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
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
          <p className={css.bodyText}>
            FK 컬럼도 함께 삭제하시겠습니까?
          </p>
          <p className={css.bodyTextSub}>
            컬럼: {pendingRelDelete.fkColNames.join(", ")}
          </p>
          <div className={css.footer}>
            <button type="button" className={css.cancelBtn} onClick={onClose}>
              취소
            </button>
            <button
              type="button"
              className={css.cancelBtn}
              onClick={onDeleteRelOnly}
            >
              관계만 삭제
            </button>
            <button
              type="button"
              className={css.dangerBtn}
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
