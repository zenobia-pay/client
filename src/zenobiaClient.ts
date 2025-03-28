import { generateQR } from "./qr.js";

export class ZenobiaClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(
    apiKey: string = "test_key",
    baseUrl: string = "https://api.zenobia.pay"
  ) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async createPayment(
    amount: number,
    currency: string,
    description: string
  ): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          amount,
          currency,
          description,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create payment");
      }

      const payment = await response.json();
      return payment.id;
    } catch (error) {
      console.error("Error creating payment:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to create payment");
    }
  }
  async generateQRCode(paymentId: number): Promise<string> {
    // Generate a QR code for the payment
    const paymentUrl = `${this.baseUrl}/pay/${paymentId}`;
    return generateQR(paymentUrl);
  }
}
