#!/usr/bin/env node
/**
 * provider별 모델 목록 API를 조회해 packages/contracts/src/ai/models.ts에 없는
 * 신규 모델을 찾는다. --write 옵션이 있으면 각 provider 그룹 끝에 항목을 삽입한다.
 * (라벨·권장 태그·순서는 자동 생성하지 않으므로 PR 리뷰에서 사람이 정리한다.)
 *
 * 사용법:
 *   node scripts/check-new-models.mjs           # 보고만
 *   node scripts/check-new-models.mjs --write   # models.ts에 삽입
 *
 * 키가 없는 provider는 건너뛴다: ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MODELS_TS = join(ROOT, "packages/contracts/src/ai/models.ts");
const IGNORE_JSON = join(ROOT, "scripts/model-ignore-list.json");

// ── 레지스트리 파싱 ──────────────────────────────────────────────────────────

/** models.ts 소스에서 { provider, value } 목록을 추출한다. */
export function parseRegistry(source) {
  const entries = [];
  const re = /\{\s*provider:\s*"(\w+)",\s*value:\s*"([^"]+)"/g;
  for (const m of source.matchAll(re)) entries.push({ provider: m[1], value: m[2] });
  return entries;
}

/**
 * API가 반환한 id가 레지스트리에 이미 있는지 판단한다.
 * alias(claude-sonnet-5)와 날짜 접미사 full id(claude-haiku-4-5-20251001)를
 * 양방향으로 허용한다.
 */
export function isCovered(registryValues, id) {
  return registryValues.some((v) => v === id || id.startsWith(`${v}-`) || v.startsWith(`${id}-`));
}

// ── provider별 조회 + 필터 ───────────────────────────────────────────────────

async function fetchJson(url, headers = {}) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

export async function fetchAnthropicModels(apiKey) {
  const models = [];
  let afterId;
  for (let page = 0; page < 10; page++) {
    const qs = afterId ? `?limit=100&after_id=${afterId}` : "?limit=100";
    const data = await fetchJson(`https://api.anthropic.com/v1/models${qs}`, {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    });
    models.push(...(data.data ?? []));
    if (!data.has_more) break;
    afterId = data.last_id;
  }
  return models.map((m) => ({ id: m.id, label: m.display_name ?? m.id }));
}

/** 채팅 완성에 못 쓰는 모델(오디오·임베딩 등)과 날짜 스냅샷을 걸러낸다. */
export function filterOpenAI(ids) {
  const exclude =
    /(audio|realtime|transcribe|tts|whisper|embedding|moderation|image|dall-e|search|instruct|computer-use|codex|chatgpt)/;
  const dated = /-\d{4}-\d{2}-\d{2}$|-\d{4}$|-\d{8}$/;
  return ids.filter((id) => /^(gpt-|o\d)/.test(id) && !exclude.test(id) && !dated.test(id) && !/preview/.test(id));
}

export async function fetchOpenAIModels(apiKey) {
  const data = await fetchJson("https://api.openai.com/v1/models", {
    Authorization: `Bearer ${apiKey}`,
  });
  return filterOpenAI((data.data ?? []).map((m) => m.id)).map((id) => ({ id, label: id }));
}

/** generateContent를 지원하는 정식(비실험) gemini 모델만 남긴다. */
export function filterGemini(models) {
  return models.filter(
    (m) =>
      (m.supportedGenerationMethods ?? []).includes("generateContent") &&
      (m.name ?? "").startsWith("models/gemini-") &&
      !/(exp|preview|embedding|aqa|tts|live|image|thinking)/.test(m.name),
  );
}

export async function fetchGeminiModels(apiKey) {
  const data = await fetchJson(
    `https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${apiKey}`,
  );
  return filterGemini(data.models ?? []).map((m) => ({
    id: m.name.replace(/^models\//, ""),
    label: m.displayName ?? m.name.replace(/^models\//, ""),
  }));
}

// ── models.ts 삽입 ───────────────────────────────────────────────────────────

/** 각 provider 그룹의 마지막 항목 뒤에 신규 항목을 삽입한 소스를 반환한다. */
export function insertModels(source, additions) {
  let out = source;
  for (const [provider, models] of Object.entries(additions)) {
    if (models.length === 0) continue;
    const lines = out.split("\n");
    let lastIdx = -1;
    lines.forEach((line, i) => {
      if (line.includes(`provider: "${provider}"`)) lastIdx = i;
    });
    if (lastIdx === -1) throw new Error(`provider 그룹을 찾을 수 없음: ${provider}`);
    const newLines = models.map(
      (m) => `  { provider: "${provider}", value: "${m.id}", label: "${m.label}" },`,
    );
    lines.splice(lastIdx + 1, 0, ...newLines);
    out = lines.join("\n");
  }
  return out;
}

// ── main ─────────────────────────────────────────────────────────────────────

const PROVIDERS = [
  { provider: "anthropic", env: "ANTHROPIC_API_KEY", fetch: fetchAnthropicModels },
  { provider: "openai", env: "OPENAI_API_KEY", fetch: fetchOpenAIModels },
  { provider: "gemini", env: "GEMINI_API_KEY", fetch: fetchGeminiModels },
];

async function main() {
  const write = process.argv.includes("--write");
  const source = readFileSync(MODELS_TS, "utf8");
  const registry = parseRegistry(source);
  const ignore = new Set(JSON.parse(readFileSync(IGNORE_JSON, "utf8")).ignore);

  const additions = {};
  for (const { provider, env, fetch: fetchModels } of PROVIDERS) {
    const key = process.env[env];
    if (!key) {
      console.log(`[skip] ${provider}: ${env} 미설정`);
      continue;
    }
    const values = registry.filter((e) => e.provider === provider).map((e) => e.value);
    try {
      const candidates = await fetchModels(key);
      const fresh = candidates.filter((m) => !isCovered(values, m.id) && !ignore.has(m.id));
      additions[provider] = fresh;
      console.log(
        `[ok] ${provider}: 후보 ${candidates.length}개 중 신규 ${fresh.length}개` +
          (fresh.length ? ` → ${fresh.map((m) => m.id).join(", ")}` : ""),
      );
    } catch (e) {
      console.error(`[error] ${provider}: ${e.message}`);
      process.exitCode = 1;
    }
  }

  const total = Object.values(additions).flat().length;
  if (total === 0) {
    console.log("신규 모델 없음.");
    return;
  }
  if (write) {
    writeFileSync(MODELS_TS, insertModels(source, additions));
    console.log(`models.ts에 ${total}개 항목 삽입 완료. 라벨·순서는 PR 리뷰에서 정리하세요.`);
  } else {
    console.log("--write 옵션을 주면 models.ts에 삽입합니다.");
  }
}

// vitest 등에서 import할 때는 실행하지 않는다.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
