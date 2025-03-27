import QRCode from "qrcode";

export async function generateQrCode(data: any): Promise<string> {
  try {
    return await QRCode.toDataURL(JSON.stringify(data));
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw error;
  }
}
