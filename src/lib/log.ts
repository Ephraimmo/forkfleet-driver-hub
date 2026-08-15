const DEV = import.meta.env.DEV;

type Scope = "AUTH" | "FIREBASE" | "ASSIGNMENT" | "ELIGIBILITY" | "ORDER" | "LOCATION" | "STATUS" | "SYNC";

/** Structured dev logging. Production logs are suppressed to avoid leaking data. */
export function log(scope: Scope, message: string, data?: unknown) {
  if (!DEV) return;
  if (data !== undefined) console.info(`[${scope}] ${message}`, data);
  else console.info(`[${scope}] ${message}`);
}

export function logError(scope: Scope, message: string, error?: unknown) {
  if (DEV) console.error(`[${scope}] ${message}`, error);
}
