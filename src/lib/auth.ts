import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { accountDatabase } from "@/lib/account-database";

export const auth = betterAuth({
  appName: "Sidflix",
  database: accountDatabase,
  emailAndPassword: { enabled: true, minPasswordLength: 10, maxPasswordLength: 128 },
  trustedOrigins: [...new Set([
    process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    ...(process.env.NODE_ENV !== "production" ? ["http://localhost:3000", "http://127.0.0.1:3000"] : []),
    ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "").split(",").map(origin => origin.trim()).filter(Boolean),
  ])],
  rateLimit: { enabled: true },
  // nextCookies must stay last so cookies set in server actions are applied.
  plugins: [nextCookies()],
});
