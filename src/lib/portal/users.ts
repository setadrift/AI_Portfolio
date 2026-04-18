/**
 * Portal users — minimal allow-list stored in env vars.
 *
 * Format: PORTAL_USERS env var is JSON like:
 *   [{"username":"gabby","password":"...","client":"ttg"},
 *    {"username":"jess","password":"...","client":"ttg"}]
 *
 * For development, defaults to a single user defined by PORTAL_PASSWORD.
 */

export interface PortalUser {
  username: string;
  password: string;
  client: string;
}

function loadUsers(): PortalUser[] {
  const raw = process.env.PORTAL_USERS;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as PortalUser[];
    } catch {
      // fall through to defaults
    }
  }
  // Dev fallback: single user using PORTAL_PASSWORD.
  const pw = process.env.PORTAL_PASSWORD;
  if (pw) {
    return [{ username: "ttg", password: pw, client: "ttg" }];
  }
  return [];
}

export function authenticate(
  username: string,
  password: string,
): PortalUser | null {
  const users = loadUsers();
  // Constant-time-ish comparison via length pre-check + char-by-char.
  for (const u of users) {
    if (u.username !== username) continue;
    if (u.password.length !== password.length) return null;
    let diff = 0;
    for (let i = 0; i < u.password.length; i++) {
      diff |= u.password.charCodeAt(i) ^ password.charCodeAt(i);
    }
    return diff === 0 ? u : null;
  }
  return null;
}
