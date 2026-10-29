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

export function parseLoginMessage(input: {
  to: string[];
  deliveredTo: string[];
  text: string;
  domain?: string;
}): ParsedLoginMessage {
  const domain = input.domain?.trim().toLowerCase();
  let alias: string | null = null;
  if (domain) {
    for (const address of [...input.to, ...input.deliveredTo]) {
      const part = localPart(address, domain);
      if (part) {
        alias = part;
        break;
      }
    }
  }
  const codeMatch = input.text.match(/\b(\d{4,8})\b/);
  return { alias, code: codeMatch ? codeMatch[1] : null };
}
