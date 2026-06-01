import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

interface Config {
  apiKey?: string;
  apiUrl?: string;
}

function getConfigPath(): string {
  const base =
    process.platform === "win32"
      ? (process.env["APPDATA"] ?? join(homedir(), "AppData", "Roaming"))
      : join(homedir(), ".config");
  return join(base, "erdify", "config.json");
}

// 프로세스 내 1회만 읽도록 메모이즈 (getApiKey/getApiUrl가 호출마다 readFileSync 하던 비용 제거)
let cached: Config | undefined;

export function readConfig(): Config {
  if (cached !== undefined) return cached;
  const path = getConfigPath();
  if (!existsSync(path)) {
    cached = {};
    return cached;
  }
  try {
    cached = JSON.parse(readFileSync(path, "utf-8")) as Config;
  } catch {
    cached = {};
  }
  return cached;
}

export function writeConfig(updates: Partial<Config>): void {
  const path = getConfigPath();
  mkdirSync(dirname(path), { recursive: true });
  const current = readConfig();
  const next = { ...current, ...updates };
  writeFileSync(path, JSON.stringify(next, null, 2), "utf-8");
  cached = next; // 캐시 갱신
}

export function getApiKey(): string {
  return process.env["ERDIFY_API_KEY"] ?? readConfig().apiKey ?? "";
}

export function getApiUrl(): string {
  return (
    process.env["ERDIFY_API_URL"] ??
    readConfig().apiUrl ??
    "https://erdify-app.kro.kr/api"
  );
}
