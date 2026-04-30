import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Modal } from "../../../design-system/Modal";
import { inviteMemberByEmail } from "../../../shared/api/organizations.api";
import * as css from "./invite-modal.css";

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
}

type FormState =
  | { status: "idle" }
  | { status: "success"; email: string }
  | { status: "error"; error: string };

const SubmitButton = () => {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={css.submitBtn}>
      {pending ? "초대 중..." : "초대"}
    </button>
  );
};

export const InviteModal = ({ open, onClose, organizationId }: InviteModalProps) => {
  const [state, formAction] = useActionState<FormState, FormData>(
    async (_, formData) => {
      const email = (formData.get("email") as string | null) ?? "";
      const role = (formData.get("role") as "editor" | "viewer" | null) ?? "editor";
      try {
        await inviteMemberByEmail(organizationId, email.trim(), role);
        return { status: "success", email };
      } catch (err) {
        return {
          status: "error",
          error: err instanceof Error ? err.message : "초대에 실패했습니다",
        };
      }
    },
    { status: "idle" }
  );

  return (
    <Modal open={open} onClose={onClose} title="멤버 초대">
      {state.status === "success" ? (
        <div className={css.successContainer}>
          <div className={css.successIcon}>✓</div>
          <p className={css.successText}>{state.email} 님을 초대했습니다.</p>
          <button onClick={onClose} className={css.successCloseBtn}>
            닫기
          </button>
        </div>
      ) : (
        <form action={formAction} className={css.body}>
          <div className={css.field}>
            <label className={css.fieldLabel} htmlFor="invite-email">이메일</label>
            <input
              id="invite-email"
              type="email"
              name="email"
              placeholder="user@example.com"
              required
              autoFocus
              className={css.textInput}
            />
          </div>

          <div className={css.field}>
            <label className={css.fieldLabel} htmlFor="invite-role">권한</label>
            <select
              id="invite-role"
              name="role"
              defaultValue="editor"
              className={css.roleSelect}
            >
              <option value="editor">편집자 (Editor)</option>
              <option value="viewer">뷰어 (Viewer)</option>
            </select>
          </div>

          {state.status === "error" && (
            <p className={css.errorText}>{state.error}</p>
          )}

          <div className={css.footer}>
            <button type="button" onClick={onClose} className={css.cancelBtn}>
              취소
            </button>
            <SubmitButton />
          </div>
        </form>
      )}
    </Modal>
  );
};
