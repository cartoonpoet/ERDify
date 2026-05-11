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

export function readConfig(): Config {
  const path = getConfigPath();
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as Config;
  } catch {
    return {};
  }
}

export function writeConfig(updates: Partial<Config>): void {
  const path = getConfigPath();
  mkdirSync(dirname(path), { recursive: true });
  const current = readConfig();
  writeFileSync(path, JSON.stringify({ ...current, ...updates }, null, 2), "utf-8");
}

export function getApiKey(): string {
  return process.env["ERDIFY_API_KEY"] ?? readConfig().apiKey ?? "";
}

export function getApiUrl(): string {
  return (
    process.env["ERDIFY_API_URL"] ??
    readConfig().apiUrl ??
    "http://erdify-app.kro.kr/api"
  );
}
