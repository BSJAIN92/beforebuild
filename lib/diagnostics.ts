export function redactDiagnosticContent(value: string): string {
  return value
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[REDACTED_API_KEY]")
    .replace(/\bsk-[0-9A-Za-z_-]{16,}/g, "[REDACTED_API_KEY]")
    .replace(/\bBearer\s+[^\s,;"'}]+/gi, "Bearer [REDACTED_TOKEN]")
    .replace(/\beyJ[0-9A-Za-z_-]{10,}\.[0-9A-Za-z_-]{10,}\.[0-9A-Za-z_-]{10,}\b/g, "[REDACTED_TOKEN]")
    .replace(/((?:api[_ -]?key|access[_ -]?token|auth[_ -]?token|session[_ -]?token|run[_ -]?token|token)["'\s:=]+)[^\s,;}"']+/gi, "$1[REDACTED_SECRET]")
    .replace(/-----BEGIN [^-]+ PRIVATE KEY-----[\s\S]*?-----END [^-]+ PRIVATE KEY-----/g, "[REDACTED_PRIVATE_KEY]")
    .slice(0, 100000);
}
