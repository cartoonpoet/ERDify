import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-cbc";

function getKey(): Buffer {
  // Read at call time, not module-load time: when the key comes from a .env file
  // loaded by ConfigModule at bootstrap, process.env is not yet populated when this
  // module is first imported. Capturing it in a module-level const would fall back to
  // the dev key and fail to decrypt values written with the real key.
  const keyHex = process.env["FIELD_ENCRYPTION_KEY"] ?? "";
  if (keyHex.length === 64) return Buffer.from(keyHex, "hex");
  // fallback for dev — deterministic but not secure
  return Buffer.alloc(32, "dev-key-not-for-production");
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
