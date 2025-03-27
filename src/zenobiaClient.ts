import { createTransfer, TransferResponse, StatementItem } from "./api";
import { generateQrCode } from "./qr";
import { pollTransferStatus } from "./poll";

export class ZenobiaClient {
  private merchantBackend: string;
  private merchantId: string;

  constructor(merchantId: string, merchantBackend: string) {
    this.merchantId = merchantId;
    this.merchantBackend = merchantBackend;
  }

  async payWithZenobia(
    amount: number,
    statementItems?: StatementItem[]
  ): Promise<void> {
    try {
      const transfer: TransferResponse = await createTransfer(
        this.merchantBackend,
        amount,
        statementItems
      );

      const qrData = {
        transferRequestId: transfer.transferRequestId,
        merchantId: transfer.merchantId,
        amount: transfer.amount,
      };

      const qrCodeUrl = await generateQrCode(qrData);

      console.log("QR Code URL:", qrCodeUrl);

      // start polling
      pollTransferStatus(transfer.transferRequestId);
    } catch (error) {
      console.error("Payment initiation failed:", error);
    }
  }
}
