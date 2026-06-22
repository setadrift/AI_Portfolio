/**
 * Portal users — minimal allow-list stored in env vars.
 *
 * Format: PORTAL_USERS env var is JSON like:
 *   [{"username":"gabby","password":"...","client":"ttg"},
 *    {"username":"jess","password":"...","client":"ttg"}]
 *
 * For development, supports ADMIN_PORTAL_PASSWORD for Duncan plus a TTG user
 * defined by PORTAL_PASSWORD.
 */

export interface PortalUser {
  username: string;
  password: string;
  client: string;
}

function loadUsers(): PortalUser[] {
  const usersByName = new Map<string, PortalUser>();
  const adminPw = process.env.ADMIN_PORTAL_PASSWORD;
  if (adminPw) {
    usersByName.set("duncan", { username: "duncan", password: adminPw, client: "admin" });
  }

  // Dev fallback: single TTG user using PORTAL_PASSWORD.
  const pw = process.env.PORTAL_PASSWORD;
  if (pw) {
    usersByName.set("ttg", { username: "ttg", password: pw, client: "ttg" });
  }

  const raw = process.env.PORTAL_USERS;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const user of parsed as PortalUser[]) {
          if (user?.username && user?.password && user?.client) {
            usersByName.set(user.username, user);
          }
        }
      }
    } catch {
      // fall through to defaults
    }
  }

  return Array.from(usersByName.values());
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
