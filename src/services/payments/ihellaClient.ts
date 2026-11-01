export interface IhellaChargeInput {
  paymentId: string;
  amount: string;
  currencyCode: string;
  slotId: string;
}

export interface IIhellaClient {
  createCharge(input: IhellaChargeInput): Promise<{ providerRef: string }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export class HttpIhellaClient implements IIhellaClient {
  constructor(
    private baseUrl: string,
    private apiKey: string
  ) {}

  async createCharge(input: IhellaChargeInput): Promise<{ providerRef: string }> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/charges`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      throw new Error(`Ihella charge failed with status ${response.status}`);
    }
    const body: unknown = await response.json();
    if (!isRecord(body) || typeof body.providerRef !== "string" || body.providerRef.length === 0) {
      throw new Error("Ihella charge response had no providerRef");
    }
    return { providerRef: body.providerRef };
  }
}
