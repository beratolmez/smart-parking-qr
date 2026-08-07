import QRCode from "qrcode";
import { config } from "@/core/config";

export function assetUrl(code: string): string {
  return `${config.APP_URL.replace(/\/$/, "")}/q/${code}`;
}

export async function qrSvg(code: string, width = 240): Promise<string> {
  return QRCode.toString(assetUrl(code), {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    width,
  });
}

export async function qrPngDataUrl(code: string, width = 240): Promise<string> {
  return QRCode.toDataURL(assetUrl(code), {
    errorCorrectionLevel: "M",
    margin: 1,
    width,
  });
}
