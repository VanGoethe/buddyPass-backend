import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { env } from "../config/env";

export interface EncryptedCredential {
  passwordCiphertext: string;
  passwordIv: string;
  passwordTag: string;
  keyVersion: number;
}

/**
 * Encrypts shared subscription passwords so they can be revealed to the slot owner.
 * The key version is stored with each ciphertext so a future key can be swapped in one place.
 */
export class CredentialCipher {
  constructor(
    private readonly key: Buffer,
    private readonly keyVersion = 1
  ) {}

  encrypt(plaintext: string): EncryptedCredential {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    return {
      passwordCiphertext: ciphertext.toString("base64"),
      passwordIv: iv.toString("base64"),
      passwordTag: cipher.getAuthTag().toString("base64"),
      keyVersion: this.keyVersion,
    };
  }

  decrypt(payload: EncryptedCredential): string {
    if (payload.keyVersion !== this.keyVersion) {
      throw new Error("Unsupported credential key version");
    }
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.key,
      Buffer.from(payload.passwordIv, "base64")
    );
    decipher.setAuthTag(Buffer.from(payload.passwordTag, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(payload.passwordCiphertext, "base64")),
      decipher.final(),
    ]);
    return plaintext.toString("utf8");
  }
}

export const credentialCipher = new CredentialCipher(
  Buffer.from(env.CREDENTIALS_ENCRYPTION_KEY, "base64")
);
