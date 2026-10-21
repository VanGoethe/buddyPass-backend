import { credentialCipher } from "../../src/utils/credentialCipher";

export const FUTURE_EXPIRES_AT = new Date("2027-12-31T00:00:00.000Z");

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
