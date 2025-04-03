import { generateQR } from "./qr.js";

export interface StatementItem {
  name: string;
  amount: number;
}

export class ZenobiaClient {
  constructor() {}

  async createTransferRequest(
    url: string,
    amount: number,
    statementItems: StatementItem[]
  ): Promise<number> {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          statementItems,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create transfer request");
      }

      console.log("response", response.json());
      const transfer = await response.json();
      return transfer;
    } catch (error) {
      console.error("Error creating transfer request:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to create transfer request");
    }
  }

  async generateQRCode(paymentUrl: string): Promise<string> {
    // Generate a QR code for the payment
    return generateQR(paymentUrl);
  }
}
