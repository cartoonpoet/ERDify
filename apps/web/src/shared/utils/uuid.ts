export const randomUUID = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // crypto.getRandomValues는 crypto.randomUUID보다 훨씬 오래전(~2011년)부터 브라우저에
  // 보편적으로 지원되어 왔으므로, randomUUID가 없는 환경에서도 사실상 항상 존재하는
  // 폴백 경로다. Math.random()은 예측 가능한 PRNG라 여기서 쓰지 않는다.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = crypto.getRandomValues(new Uint8Array(1))[0]! % 16;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
};
