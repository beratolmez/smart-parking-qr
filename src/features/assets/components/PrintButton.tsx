"use client";

import { Button } from "@/shared/ui/Button";

export function PrintButton() {
  return (
    <Button type="button" className="print:hidden" onClick={() => window.print()}>
      Yazdır
    </Button>
  );
}
