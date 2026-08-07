export function formatDateTR(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(d);
}

export function formatDurationTR(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes < 1) return "1 saatten az";

  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days >= 1) {
    return hours >= 1 ? `${days} gün ${hours} saat` : `${days} gün`;
  }
  if (hours >= 1) {
    return minutes >= 1 ? `${hours} saat ${minutes} dakika` : `${hours} saat`;
  }
  return `${minutes} dakika`;
}
