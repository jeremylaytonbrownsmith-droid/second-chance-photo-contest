import QRCode from "qrcode";

/** Renders a QR code pointing at `url` as a data URL — generated
 * server-side so the pet page doesn't depend on a third-party QR image
 * service being up (or on sending the URL to one). */
export async function qrCodeDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 240,
    margin: 1,
    color: { dark: "#5c3480", light: "#ffffff" },
  });
}
