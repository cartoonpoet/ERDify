import { useEffect, useState } from "react";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5분

export const useVersionPolling = () => {
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    const currentBuildTime = __BUILD_TIME__;

    const check = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`);
        if (!res.ok) return;
        const { buildTime } = await res.json();
        if (buildTime !== currentBuildTime) {
          setHasUpdate(true);
        }
      } catch {
        // 네트워크 오류 무시
      }
    };

    const id = setInterval(check, POLL_INTERVAL_MS);

    const onFocus = () => check();
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return hasUpdate;
};
