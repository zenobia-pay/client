import QRCode from "qrcode";

export async function generateQR(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text);
  } catch (err) {
    console.error(err);
    throw new Error("Failed to generate QR code");
  }
}
