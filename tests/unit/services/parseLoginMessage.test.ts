import { parseLoginMessage } from "../../../src/services/inbox/parseLoginMessage";

describe("parseLoginMessage", () => {
  it("reads the alias and the code", () => {
    const parsed = parseLoginMessage({
      to: ["Seat <seatabc@codes.example>"],
      deliveredTo: [],
      text: "Your Netflix code is 482913",
      domain: "codes.example",
    });
    expect(parsed).toEqual({ alias: "seatabc", code: "482913" });
  });

  it("leaves the alias empty when the domain does not match", () => {
    const parsed = parseLoginMessage({
      to: ["login@netflix.com"],
      deliveredTo: [],
      text: "code 1234",
      domain: "codes.example",
    });
    expect(parsed.alias).toBeNull();
    expect(parsed.code).toBe("1234");
  });
});
