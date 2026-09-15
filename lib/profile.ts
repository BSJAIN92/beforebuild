export function validateDisplayName(value: string): string {
  const name = value.trim();
  if (!name || name.length > 100) throw new Error("Use a name between 1 and 100 characters.");
  if (/[\u0000-\u001f\u007f]/.test(name)) throw new Error("Your name cannot contain control characters.");
  return name;
}

export function suggestedDisplayName(givenName?: string, name?: string): string {
  const candidate = (givenName || name || "").trim();
  try { return candidate ? validateDisplayName(candidate) : ""; } catch { return ""; }
}
