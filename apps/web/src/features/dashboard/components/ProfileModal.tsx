import { type ReactNode, useState } from "react";
import { Modal } from "@/components";
import { ProfileTab } from "./ProfileTab";
import { PasswordTab } from "./PasswordTab";
import { DeleteAccountTab } from "./DeleteAccountTab";
import * as css from "./ProfileModal.css";

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

type Tab = "profile" | "password" | "danger";

export const ProfileModal = ({ open, onClose }: ProfileModalProps) => {
  const [tab, setTab] = useState<Tab>("profile");

  const tabContent: Record<Tab, ReactNode> = {
    profile: <ProfileTab onClose={onClose} />,
    password: <PasswordTab onClose={onClose} />,
    danger: <DeleteAccountTab onClose={onClose} />,
  };

  return (
    <Modal open={open} onClose={onClose} title="회원정보 수정">
      <div className={css.body}>
        <div className={css.tabs}>
          <button
            type="button"
            className={`${css.tab} ${tab === "profile" ? css.tabActive : ""}`}
            onClick={() => setTab("profile")}
          >
            프로필
          </button>
          <button
            type="button"
            className={`${css.tab} ${tab === "password" ? css.tabActive : ""}`}
            onClick={() => setTab("password")}
          >
            비밀번호 변경
          </button>
          <button
            type="button"
            className={`${css.tab} ${tab === "danger" ? css.tabActive : ""}`}
            onClick={() => setTab("danger")}
            style={{ color: tab === "danger" ? "#ef4444" : "#9ca3af" }}
          >
            계정 탈퇴
          </button>
        </div>

        {tabContent[tab]}
      </div>
    </Modal>
  );
};
