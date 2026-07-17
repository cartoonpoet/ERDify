export const randomUUID = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // crypto.randomUUID()가 없는 구형 환경도 Web Crypto(getRandomValues) 자체는 지원하는
  // 경우가 많다 — Math.random()보다 예측 불가능한 이 경로를 우선 쓰고, Web Crypto 자체가
  // 없는(사실상 존재하지 않는) 환경에서만 Math.random()으로 최종 폴백한다.
  const nextByte =
    typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function"
      ? () => crypto.getRandomValues(new Uint8Array(1))[0]!
      : () => Math.floor(Math.random() * 256);

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = nextByte() % 16;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
};
