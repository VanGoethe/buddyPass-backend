import { credentialCipher } from "../../src/utils/credentialCipher";

export const FUTURE_EXPIRES_AT = new Date("2027-12-31T00:00:00.000Z");

let aliasSequence = 0;

export function occupiedSlotData(userId: string, subscriptionId: string): {
  userId: string;
  subscriptionId: string;
  access: "ACTIVE";
  aliasLocalPart: string;
  termStartsAt: Date;
  termEndsAt: Date;
} {
  aliasSequence += 1;
  return {
    userId,
    subscriptionId,
    access: "ACTIVE",
    aliasLocalPart: `seattest${Date.now().toString(36)}${aliasSequence}`,
    termStartsAt: new Date("2026-10-01T00:00:00.000Z"),
    termEndsAt: new Date("2026-11-01T00:00:00.000Z"),
  };
}

export function subscriptionSecrets(password = "SharedPass1"): {
  passwordCiphertext: string;
  passwordIv: string;
  passwordTag: string;
  keyVersion: number;
  needsCredentialReset: false;
} {
  return {
    ...credentialCipher.encrypt(password),
    needsCredentialReset: false,
  };
}
