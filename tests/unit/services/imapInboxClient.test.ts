const mockSearch = jest.fn();
const mockFetchOne = jest.fn();
const mockFlags = jest.fn();

jest.mock("imapflow", () => ({
  ImapFlow: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    logout: jest.fn().mockResolvedValue(undefined),
    getMailboxLock: jest.fn().mockResolvedValue({ release: jest.fn() }),
    search: (...args: unknown[]) => mockSearch(...args),
    fetchOne: (...args: unknown[]) => mockFetchOne(...args),
    messageFlagsAdd: (...args: unknown[]) => mockFlags(...args),
  })),
}));

jest.mock("mailparser", () => ({
  simpleParser: jest.fn().mockResolvedValue({
    text: "Your code is 482913",
    to: { value: [{ address: "You+Netflix1@gmail.com" }] },
    cc: { value: [{ address: "copy@example.com" }] },
    from: { value: [{ address: "info@account.netflix.com" }] },
    headers: { get: () => "you+netflix1@gmail.com" },
  }),
}));

import { ImapInboxClient } from "../../../src/services/inbox/imapInboxClient";

describe("IMAP inbox client", () => {
  beforeEach(() => {
    mockSearch.mockReset();
    mockFetchOne.mockReset();
    mockFlags.mockReset();
    mockSearch.mockResolvedValue([15]);
    mockFetchOne.mockResolvedValue({
      source: Buffer.from("raw"),
      internalDate: new Date("2026-11-01T12:00:00.000Z"),
    });
    mockFlags.mockResolvedValue(undefined);
  });

  it("reads by UID and returns the raw message", async () => {
    const client = new ImapInboxClient({
      host: "imap.test",
      port: 993,
      user: "inbox",
      password: "secret",
    });
    const messages = await client.fetchUnseen();
    expect(mockSearch).toHaveBeenCalledWith({ seen: false }, { uid: true });
    expect(mockFetchOne).toHaveBeenCalledWith(
      "15",
      expect.objectContaining({ source: true, internalDate: true }),
      { uid: true }
    );
    expect(mockFlags).toHaveBeenCalledWith("15", ["\\Seen"], { uid: true });
    expect(messages).toEqual([
      {
        recipients: expect.arrayContaining([
          "you+netflix1@gmail.com",
          "copy@example.com",
        ]),
        from: "info@account.netflix.com",
        receivedAt: new Date("2026-11-01T12:00:00.000Z"),
        text: "Your code is 482913",
      },
    ]);
  });
});
