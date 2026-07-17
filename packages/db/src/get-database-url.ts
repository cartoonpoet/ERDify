export function getDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const databaseUrl = env["DATABASE_URL"];
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL 환경변수가 설정되지 않았습니다. 저장소 루트의 .env.example을 참고해 .env를 작성하세요."
    );
  }
  return databaseUrl;
}
