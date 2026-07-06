import { useState } from "react";
import type { DiagramObject, DiagramObjectKind } from "@erdify/domain";
import { addObject, updateObject, removeObject } from "@erdify/domain";
import { Modal, Button, Input } from "@/components";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import { DarkCodeEditor } from "./DarkCodeEditor";
import * as css from "./object-edit-modal.css";

const KIND_TABS: { label: string; value: DiagramObjectKind }[] = [
  { label: "프로시저", value: "procedure" },
  { label: "함수", value: "function" },
  { label: "트리거", value: "trigger" },
  { label: "뷰", value: "view" },
];

const MODE_TITLES: Record<"add" | "edit", string> = {
  add: "객체 추가",
  edit: "객체 편집",
};

interface ObjectEditModalProps {
  object: DiagramObject;
  mode: "add" | "edit";
  onClose: () => void;
}

export const ObjectEditModal = ({ object, mode, onClose }: ObjectEditModalProps) => {
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
        {KIND_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setKind(t.value)}
            className={css.kindTabVariants[kind === t.value ? "active" : "inactive"]}
          >
            {t.label}
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
