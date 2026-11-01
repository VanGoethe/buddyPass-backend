import { Prisma } from "@prisma/client";
import { ValidationError } from "../../utils/errors";

const E164 = /^\+[1-9]\d{7,14}$/;

export function isProfileComplete(user: {
  name?: string | null;
  phone?: string | null;
  countryId?: string | null;
}): boolean {
  return Boolean(user.name && user.name.trim().length >= 2 && user.phone && user.countryId);
}

export function missingProfileFields(user: {
  name?: string | null;
  phone?: string | null;
  countryId?: string | null;
}): string[] {
  const missing: string[] = [];
  if (!user.name || user.name.trim().length < 2) {
    missing.push("name");
  }
  if (!user.phone) {
    missing.push("phone");
  }
  if (!user.countryId) {
    missing.push("countryId");
  }
  return missing;
}

export function normalizePhone(input: string): string {
  const compact = input.trim().replace(/[\s.\-()]/g, "");
  if (!E164.test(compact)) {
    throw new ValidationError(
      "Phone number must be in international format, such as +25779123456"
    );
  }
  return compact;
}

export function assertTimezone(value: string): string {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
  } catch {
    throw new ValidationError("Timezone must be an IANA name, such as Africa/Bujumbura");
  }
  return value;
}

export function assertMetadata(value: unknown): Prisma.InputJsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError("Metadata must be an object");
  }
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length > 20) {
    throw new ValidationError("Metadata can have at most 20 keys");
  }
  if (Buffer.byteLength(JSON.stringify(record)) > 2048) {
    throw new ValidationError("Metadata must be at most 2 KB");
  }
  return record as Prisma.InputJsonObject;
}
