import { useState } from "react";
import type { DiagramObject, DiagramObjectKind } from "@erdify/domain";
import { addObject, updateObject, removeObject } from "@erdify/domain";
import { Modal, Button, Input } from "@/components";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import { OBJECT_KINDS, OBJECT_KIND_LABELS } from "@/features/editor/constants/object-kind";
import { DarkCodeEditor } from "./DarkCodeEditor";
import * as css from "./object-edit-modal.css";

const MODE_TITLES: Record<"add" | "edit", string> = {
  add: "객체 추가",
  edit: "객체 편집",
};

interface ObjectEditModalProps {
  object: DiagramObject;
  mode: "add" | "edit";
  onClose: () => void;
  /** 저장 성공 시 저장된 종류를 알려 목록 필터가 해당 종류를 켜도록 한다. */
  onSaved?: (kind: DiagramObjectKind) => void;
}

export const ObjectEditModal = ({ object, mode, onClose, onSaved }: ObjectEditModalProps) => {
  const [kind, setKind] = useState<DiagramObjectKind>(object.kind);
  const [name, setName] = useState(object.name);
  const [sql, setSql] = useState(object.sql);
  const [isDragOver, setIsDragOver] = useState(false);

  const applyCommand = useEditorStore((s) => s.applyCommand);
  const canEdit = useEditorStore((s) => s.canEdit);

  const trimmedName = name.trim();
  const canSave = canEdit && trimmedName.length > 0;

  const handleSave = () => {
    if (!canSave) return;

    if (mode === "add") {
      applyCommand((doc) => addObject(doc, { id: object.id, kind, name: trimmedName, sql }));
    } else {
      applyCommand((doc) => updateObject(doc, object.id, { kind, name: trimmedName, sql }));
    }
    onSaved?.(kind);
    onClose();
  };

  const handleDelete = () => {
    if (!canEdit) return;
    if (!window.confirm(`'${object.name || "이름 없음"}' 객체를 삭제하시겠습니까?`)) return;
    applyCommand((doc) => removeObject(doc, object.id));
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={MODE_TITLES[mode]} maxWidth="660px">
      <div className={css.kindTabsRow}>
        {OBJECT_KINDS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setKind(value)}
            className={css.kindTabVariants[kind === value ? "active" : "inactive"]}
          >
            {OBJECT_KIND_LABELS[value]}
          </button>
        ))}
      </div>

      <div className={css.nameField}>
        <div className={css.fieldLabel}>이름</div>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="객체 이름"
        />
      </div>

      <div className={css.fieldLabel}>SQL</div>
      <DarkCodeEditor
        value={sql}
        onChange={setSql}
        onFileDrop={(file) => file.text().then(setSql)}
        height="240px"
        placeholder={"CREATE PROCEDURE sp_example (...)\nBEGIN\n  ...\nEND;"}
        isDragOver={isDragOver}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
      />

      {trimmedName.length === 0 && (
        <div className={css.warningText}>이름을 입력해야 저장할 수 있습니다.</div>
      )}

      <div className={css.actionsRow}>
        {mode === "edit" ? (
          <button
            type="button"
            className={css.deleteBtn}
            onClick={handleDelete}
            disabled={!canEdit}
          >
            삭제
          </button>
        ) : (
          <span />
        )}
        <div className={css.actionsRowRight}>
          <button type="button" className={css.cancelBtn} onClick={onClose}>
            취소
          </button>
          <Button variant="primary" size="md" onClick={handleSave} disabled={!canSave}>
            저장
          </Button>
        </div>
      </div>
    </Modal>
  );
};
