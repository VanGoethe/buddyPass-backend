import { createHmac } from "crypto";
import { verifyIhellaSignature } from "../../../src/services/payments/signature";

describe("verifyIhellaSignature", () => {
  it("accepts a matching HMAC and rejects a mismatch", () => {
    const body = Buffer.from('{"providerRef":"pay_1"}');
    const secret = "webhook-secret";
    const signature = createHmac("sha256", secret).update(body).digest("hex");
    expect(verifyIhellaSignature(body, signature, secret)).toBe(true);
    expect(verifyIhellaSignature(body, "nope", secret)).toBe(false);
    expect(verifyIhellaSignature(body, undefined, secret)).toBe(false);
  });
});