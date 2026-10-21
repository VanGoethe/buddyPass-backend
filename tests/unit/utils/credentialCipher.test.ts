import { credentialCipher } from "../../../src/utils/credentialCipher";

describe("CredentialCipher", () => {
  it("round-trips a password", () => {
    const encrypted = credentialCipher.encrypt("stream-password-1");
    expect(credentialCipher.decrypt(encrypted)).toBe("stream-password-1");
    expect(encrypted.passwordCiphertext).not.toContain("stream-password-1");
    expect(encrypted.keyVersion).toBe(1);
  });

  it("rejects a tampered authentication tag", () => {
    const encrypted = credentialCipher.encrypt("stream-password-1");
    const tag = Buffer.from(encrypted.passwordTag, "base64");
    tag[0] = tag[0] ^ 0xff;
    expect(() =>
      credentialCipher.decrypt({
        ...encrypted,
        passwordTag: tag.toString("base64"),
      })
    ).toThrow();
  });
});
