import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-cbc";

function getKey(): Buffer {
  // Read at call time, not module-load time: when the key comes from a .env file
  // loaded by ConfigModule at bootstrap, process.env is not yet populated when this
  // module is first imported. Capturing it in a module-level const would miss the
  // real key once it's loaded.
  const keyHex = process.env["FIELD_ENCRYPTION_KEY"] ?? "";
  if (!keyHex) {
    throw new Error(
      "FIELD_ENCRYPTION_KEY 환경변수가 설정되지 않았습니다. apps/api/.env.example을 참고해 .env를 작성하세요."
    );
  }
  if (keyHex.length !== 64) {
    throw new Error(
      "FIELD_ENCRYPTION_KEY는 64자리 hex 문자열이어야 합니다 (openssl rand -hex 32로 생성)."
    );
  }
  return Buffer.from(keyHex, "hex");
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(ciphertext: string): string {
  const [ivHex, encHex] = ciphertext.split(":");
  if (!ivHex || !encHex) return ciphertext;
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, "hex"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encHex, "hex")), decipher.final()]);
  return decrypted.toString("utf8");
}
