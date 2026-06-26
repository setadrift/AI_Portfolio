export interface HelperUploadAccess {
  helperName?: string;
  allowedPropertyIds: string[];
}

interface HelperUploadTokenConfig extends HelperUploadAccess {
  token: string;
}

export const HELPER_UPLOAD_TOKEN_PARAM = "helperToken";

export function validateHelperUploadToken(token: string | null | undefined): HelperUploadAccess | null {
  const candidate = token?.trim();
  if (!candidate) return null;

  for (const config of loadHelperUploadTokenConfigs()) {
    if (constantTimeEqual(candidate, config.token)) {
      return {
        helperName: config.helperName,
        allowedPropertyIds: config.allowedPropertyIds,
      };
    }
  }

  return null;
}

function loadHelperUploadTokenConfigs(): HelperUploadTokenConfig[] {
  const configs: HelperUploadTokenConfig[] = [];
  const singleToken = process.env.ALEX_TURN_REPAIR_HELPER_UPLOAD_TOKEN;

  if (singleToken) {
    configs.push({
      token: singleToken,
      helperName: process.env.ALEX_TURN_REPAIR_HELPER_NAME || "Helper",
      allowedPropertyIds: parseCsv(process.env.ALEX_TURN_REPAIR_HELPER_PROPERTY_IDS),
    });
  }

  const raw = process.env.ALEX_TURN_REPAIR_HELPER_UPLOAD_TOKENS;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (!item || typeof item !== "object") continue;
          const token = stringValue((item as Record<string, unknown>).token);
          if (!token) continue;
          configs.push({
            token,
            helperName: stringValue((item as Record<string, unknown>).helperName) || "Helper",
            allowedPropertyIds: arrayValue((item as Record<string, unknown>).allowedPropertyIds),
          });
        }
      }
    } catch {
      // Invalid helper token config disables only the multi-token extension.
    }
  }

  return configs;
}

function parseCsv(value: string | undefined): string[] {
  return value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function arrayValue(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function constantTimeEqual(a: string, b: string): boolean {
  const maxLength = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let index = 0; index < maxLength; index++) {
    diff |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return diff === 0;
}
