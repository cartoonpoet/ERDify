import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

// --sql-file 경로 검증 — LLM 등 자동화 호출자가 넘긴 비정상 경로 방어(S8707).
// erdify는 사용자가 자기 파일을 상대/절대 경로로 자유롭게 지정하는 도구이므로
// cwd 밖 접근을 금지하지는 않되, 널 바이트 등 명백히 잘못된 입력을 거부하고
// 경로를 정규화한 뒤 일반 파일만 읽도록 제한한다(디렉터리·디바이스·FIFO 차단).
export function sanitizeSqlFilePath(input: string): string {
  if (input.trim().length === 0 || input.includes("\0")) {
    console.error("--sql-file: invalid path");
    process.exit(1);
  }
  const resolved = resolve(process.cwd(), input);
  let isFile: boolean;
  try {
    isFile = statSync(resolved).isFile();
  } catch {
    console.error(`--sql-file: file not found: ${resolved}`);
    process.exit(1);
  }
  if (!isFile) {
    console.error(`--sql-file: not a regular file: ${resolved}`);
    process.exit(1);
  }
  return resolved;
}

// --sql 또는 --sql-file 중 하나에서 SQL 원문을 읽는다. 둘 다 없으면 종료.
export function resolveSql(opts: { sql?: string; sqlFile?: string }): string {
  if (opts.sql !== undefined) return opts.sql;
  if (opts.sqlFile !== undefined) return readFileSync(sanitizeSqlFilePath(opts.sqlFile), "utf8");
  console.error("Provide --sql <text> or --sql-file <path>");
  process.exit(1);
}
