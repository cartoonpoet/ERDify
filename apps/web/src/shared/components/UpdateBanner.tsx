import { useState } from "react";
import { X } from "lucide-react";
import { useVersionPolling } from "@/features/editor/hooks/useVersionPolling";
import { banner, message, refreshBtn, dismissBtn } from "./UpdateBanner.css";

export const UpdateBanner = () => {
  const hasUpdate = useVersionPolling();
  const [dismissed, setDismissed] = useState(false);

  if (!hasUpdate || dismissed) return null;

  return (
    <output className={banner}>
      <span className={message}>새 버전이 배포되었습니다.</span>
      <button className={refreshBtn} onClick={() => window.location.reload()}>
        새로고침
      </button>
      <button className={dismissBtn} aria-label="닫기" onClick={() => setDismissed(true)}>
        <X size={14} />
      </button>
    </output>
  );
};
