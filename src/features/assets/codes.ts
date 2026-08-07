import type { AssetType } from "@/generated/prisma/enums";
import { ASSET_TYPE_PREFIXES } from "@/features/assets/constants";

export function formatAssetCode(type: AssetType, sequence: number): string {
  return `${ASSET_TYPE_PREFIXES[type]}-${String(sequence).padStart(4, "0")}`;
}

export function parseAssetCode(code: string): { prefix: string; sequence: number } | null {
  const match = /^([A-Z]+)-(\d+)$/.exec(code.trim());
  if (!match) return null;
  const [, prefix, digits] = match;
  return { prefix, sequence: Number(digits) };
}

export function normalizeAssetCode(input: string): string {
  // Türkçe yerelde "i".toUpperCase() === "İ" olur; "en-US" ile bu tuzaktan kaçınılır.
  const cleaned = input.trim().toLocaleUpperCase("en-US").replace(/[\s_]+/g, "-");
  const match = /^([A-Z]+)-?(\d+)$/.exec(cleaned);
  if (!match) return cleaned;
  const [, prefix, digits] = match;
  return `${prefix}-${digits.padStart(4, "0")}`;
}
