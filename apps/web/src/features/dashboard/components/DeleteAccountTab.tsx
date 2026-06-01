import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/shared/store/useAuthStore";
import { Button } from "@/components";
import { deleteAccount } from "@/shared/api/auth.api";
import { useQueryClient } from "@tanstack/react-query";
import { form, footer } from "./modal-form.css";
import * as css from "./ProfileModal.css";

interface DeleteAccountTabProps {
  onClose: () => void;
}

export const DeleteAccountTab = ({ onClose }: DeleteAccountTabProps) => {
  const navigate = useNavigate();
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      await deleteAccount();
      setAuthenticated(false);
      queryClient.clear();
      onClose();
      navigate("/login");
    } catch {
      setError("탈퇴 처리 중 오류가 발생했습니다. 다시 시도해 주세요.");
      setLoading(false);
    }
  };

  return (
    <div className={form} style={{ gap: 16 }}>
      <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "14px 16px" }}>
        <p style={{ color: "#991b1b", fontSize: 13, fontWeight: 600, margin: "0 0 6px" }}>계정을 탈퇴하면 다음이 모두 삭제됩니다</p>
        <ul style={{ color: "#7f1d1d", fontSize: 12, margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
          <li>내가 소유한 모든 조직, 프로젝트, ERD 다이어그램</li>
          <li>프로필 정보 및 API 키</li>
          <li>이 작업은 되돌릴 수 없습니다</li>
        </ul>
      </div>

      {!confirm ? (
        <div className={footer}>
          <Button variant="secondary" size="md" type="button" onClick={onClose}>취소</Button>
          <Button
            variant="primary"
            size="md"
            type="button"
            onClick={() => setConfirm(true)}
            style={{ background: "#ef4444", borderColor: "#ef4444" }}
          >
            계속하기
          </Button>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 13, color: "#374151", margin: 0, textAlign: "center" }}>
            정말로 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </p>
          {error && <p className={css.errorMsg}>{error}</p>}
          <div className={footer}>
            <Button variant="secondary" size="md" type="button" onClick={() => setConfirm(false)} disabled={loading}>
              돌아가기
            </Button>
            <Button
              variant="primary"
              size="md"
              type="button"
              onClick={handleDelete}
              disabled={loading}
              style={{ background: "#ef4444", borderColor: "#ef4444" }}
            >
              {loading ? "처리 중..." : "탈퇴하기"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
