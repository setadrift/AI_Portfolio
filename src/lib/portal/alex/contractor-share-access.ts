import { SignJWT, jwtVerify } from "jose";

export interface ContractorShareScope {
  property: string;
  contractor: string;
  excludedIds: string[];
}

const SHARE_TTL_HOURS = 24 * 14;

export async function signContractorShareScope(scope: ContractorShareScope): Promise<string> {
  return await new SignJWT({
    property: scope.property,
    contractor: scope.contractor,
    excludedIds: scope.excludedIds,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SHARE_TTL_HOURS}h`)
    .sign(secret());
}

export async function verifyContractorShareScope(token: string): Promise<ContractorShareScope | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    const property = stringValue(payload.property);
    const contractor = stringValue(payload.contractor);
    const excludedIds = Array.isArray(payload.excludedIds)
      ? payload.excludedIds.filter((item): item is string => typeof item === "string")
      : [];

    if (!property && !contractor) return null;
    return { property, contractor, excludedIds };
  } catch {
    return null;
  }
}

function secret() {
  const raw = process.env.PORTAL_SESSION_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error("PORTAL_SESSION_SECRET must be set (>= 32 chars)");
  }
  return new TextEncoder().encode(raw);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
