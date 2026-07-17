export const copyToClipboard = (text: string): Promise<void> => {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  // Fallback for HTTP (non-secure) contexts where navigator.clipboard is unavailable.
  // document.execCommand는 deprecated이지만, 보안 컨텍스트가 아닌 곳에서 프로그래밍적으로
  // 클립보드에 복사할 수 있는 유일한 방법이라 대체할 표준 API가 없다 (Clipboard API 자체가
  // 보안 컨텍스트를 요구함) — 의도적으로 유지.
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.cssText = "position:fixed;opacity:0;pointer-events:none";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    document.execCommand("copy"); // NOSONAR: 비보안 컨텍스트용 폴백, 대체 API 없음 (위 주석 참고)
  } finally {
    document.body.removeChild(textarea);
  }
  return Promise.resolve();
};
