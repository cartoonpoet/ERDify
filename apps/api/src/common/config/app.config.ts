import { registerAs } from "@nestjs/config";

export default registerAs("app", () => ({
  persistIntervalMs: Number.parseInt(process.env["PERSIST_INTERVAL_MS"] ?? "30000", 10),
  inviteExpiryDays: Number.parseInt(process.env["INVITE_EXPIRY_DAYS"] ?? "7", 10),
}));
