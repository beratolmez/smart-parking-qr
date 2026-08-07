import { Prisma, type Report } from "@/generated/prisma/client";

export async function findOpenReport(
  tx: Prisma.TransactionClient,
  assetId: string,
): Promise<Report | null> {
  return tx.report.findFirst({
    where: { assetId, status: { in: ["YENI", "ATANDI"] } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createReport(
  tx: Prisma.TransactionClient,
  data: Prisma.ReportCreateInput,
): Promise<Report> {
  return tx.report.create({ data });
}

export async function registerDuplicate(
  tx: Prisma.TransactionClient,
  reportId: string,
  photoUrl: string,
): Promise<Report> {
  return tx.report.update({
    where: { id: reportId },
    data: { duplicateCount: { increment: 1 }, photoUrl },
  });
}

/** Takip numarası tahsisinde yarış koşulunu engelleyen atomik sayaç. */
export async function allocateTicketNo(tx: Prisma.TransactionClient): Promise<number> {
  const counter = await tx.reportCounter.upsert({
    where: { id: 1 },
    create: { id: 1, lastValue: 1 },
    update: { lastValue: { increment: 1 } },
  });
  return counter.lastValue;
}
