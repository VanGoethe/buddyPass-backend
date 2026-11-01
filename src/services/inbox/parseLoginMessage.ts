export interface ParsedLoginMessage {
  alias: string | null;
  code: string | null;
}

function localPart(address: string, domain: string): string | null {
  const matches = address.toLowerCase().match(/[a-z0-9._+-]+@[a-z0-9.-]+/g) ?? [];
  for (const email of matches) {
    const at = email.lastIndexOf("@");
    if (email.slice(at + 1) === domain) {
      return email.slice(0, at);
    }
  }
  return null;
}

export function seatAliasFrom(recipients: string[], domain?: string): string | null {
  const host = domain?.trim().toLowerCase();
  if (!host) {
    return null;
  }
  for (const address of recipients) {
    const part = localPart(address, host);
    if (part) {
      return part;
    }
  }
  return null;
}

export function extractCode(text: string, pattern?: string | null): string | null {
  if (pattern && pattern.trim().length > 0) {
    try {
      const match = text.match(new RegExp(pattern, "i"));
      if (!match) {
        return null;
      }
      return match[1] ?? match[0];
    } catch {
      return null;
    }
  }
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!/code/i.test(line)) {
      continue;
    }
    const onLine = line.match(/\b(\d{4,8})\b/);
    if (onLine) {
      return onLine[1];
    }
  }
  const fallback = text.match(/\b(\d{4,8})\b/);
  return fallback ? fallback[1] : null;
}

export function senderAllowed(from: string | null, domains: string[]): boolean {
  if (!from || domains.length === 0) {
    return false;
  }
  const at = from.lastIndexOf("@");
  if (at < 0) {
    return false;
  }
  const host = from.slice(at + 1).toLowerCase();
  return domains.some((allowed) => {
    const domain = allowed.trim().toLowerCase();
    return host === domain || host.endsWith(`.${domain}`);
  });
}

export function parseLoginMessage(input: {
  to: string[];
  deliveredTo: string[];
  text: string;
  domain?: string;
}): ParsedLoginMessage {
  return {
    alias: seatAliasFrom([...input.to, ...input.deliveredTo], input.domain),
    code: extractCode(input.text),
  };
}
