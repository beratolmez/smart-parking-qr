import { notFound } from "next/navigation";
import { NotFoundError } from "@/core/errors";
import { ASSET_STATUS_LABELS, ASSET_TYPE_LABELS } from "@/features/assets/constants";
import { ISSUE_TYPE_LABELS, REPORT_STATUS_LABELS } from "@/features/reports/constants";
import * as reportService from "@/features/reports/service";
import { StatusBadge } from "@/features/reports/components/StatusBadge";
import { TransitionForm } from "@/features/reports/components/TransitionForm";
import { getCurrentUser } from "@/features/auth/dal";
import { formatDateTR, formatDurationTR } from "@/shared/format";

export default async function BildirimDetayPage(props: PageProps<"/panel/bildirimler/[id]">) {
  const { id } = await props.params;

  const report = await reportService.getReport(id).catch((e) => {
    if (e instanceof NotFoundError) return null;
    throw e;
  });
  if (!report) notFound();

  const [history, user] = await Promise.all([
    reportService.getReportAssetHistory(report.assetId),
    getCurrentUser(),
  ]);

  const resolutionDuration =
    report.status === "ONARILDI" && report.closedAt
      ? formatDurationTR(report.closedAt.getTime() - report.createdAt.getTime())
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            #{report.ticketNo}
          </h1>
          <StatusBadge status={report.status} />
          {report.duplicateCount > 1 && (
            <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-100">
              {report.duplicateCount} kişi bildirdi
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Oluşturulma: {formatDateTR(report.createdAt)}
          {report.closedAt && ` · Kapanma: ${formatDateTR(report.closedAt)}`}
          {resolutionDuration && ` · Çözüm süresi: ${resolutionDuration}`}
        </p>
      </div>

      {report.photoUrl && (
        <div className="flex flex-wrap gap-4">
          <figure className="flex flex-col gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={report.photoUrl}
              alt="Bildirim fotoğrafı"
              className="max-h-72 rounded-lg border border-zinc-200 object-contain dark:border-zinc-800"
            />
            <figcaption className="text-xs text-zinc-500 dark:text-zinc-400">Bildirim</figcaption>
          </figure>
          {report.resolvedPhoto && (
            <figure className="flex flex-col gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={report.resolvedPhoto}
                alt="Onarım fotoğrafı"
                className="max-h-72 rounded-lg border border-zinc-200 object-contain dark:border-zinc-800"
              />
              <figcaption className="text-xs text-zinc-500 dark:text-zinc-400">Onarım</figcaption>
            </figure>
          )}
        </div>
      )}

      <section className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Demirbaş</h2>
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500 dark:text-zinc-400">Kod</dt>
            <dd className="font-mono font-semibold text-zinc-900 dark:text-zinc-50">
              {report.asset.code}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500 dark:text-zinc-400">Tür</dt>
            <dd className="text-zinc-900 dark:text-zinc-50">{ASSET_TYPE_LABELS[report.asset.type]}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500 dark:text-zinc-400">Park</dt>
            <dd className="text-zinc-900 dark:text-zinc-50">{report.asset.park.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500 dark:text-zinc-400">Durum</dt>
            <dd className="text-zinc-900 dark:text-zinc-50">
              {ASSET_STATUS_LABELS[report.asset.status]}
            </dd>
          </div>
        </dl>
        {report.asset.latitude !== null &&
          report.asset.longitude !== null &&
          report.asset.latitude !== undefined &&
          report.asset.longitude !== undefined && (
            <a
              href={`https://www.google.com/maps?q=${report.asset.latitude},${report.asset.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
            >
              Haritada görüntüle
            </a>
          )}
      </section>

      {report.description && (
        <section className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Açıklama</h2>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">{report.description}</p>
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Bu demirbaş için son 12 ayda {history.length} bildirim
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Kayıt yok.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-4 py-2 text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">{formatDateTR(h.createdAt)}</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {ISSUE_TYPE_LABELS[h.issueType]}
                </span>
                <StatusBadge status={h.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Olay Akışı</h2>
        {report.events.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Henüz olay kaydı yok — bildirim {REPORT_STATUS_LABELS[report.status]} durumunda.
          </p>
        ) : (
          <ol className="flex flex-col gap-4">
            {report.events.map((event) => (
              <li key={event.id} className="flex flex-col gap-1 border-l-2 border-zinc-200 pl-4 dark:border-zinc-700">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {event.fromStatus
                    ? `${REPORT_STATUS_LABELS[event.fromStatus]} → ${REPORT_STATUS_LABELS[event.toStatus]}`
                    : REPORT_STATUS_LABELS[event.toStatus]}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {event.actor?.fullName ?? "Sistem"} · {formatDateTR(event.createdAt)}
                </p>
                {event.note && <p className="text-sm text-zinc-700 dark:text-zinc-300">{event.note}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>

      <TransitionForm
        reportId={report.id}
        status={report.status}
        canReject={user?.role === "YONETICI"}
        assetCode={report.asset.code}
      />
    </div>
  );
}
