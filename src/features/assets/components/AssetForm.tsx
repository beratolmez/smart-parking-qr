"use client";

import { useActionState } from "react";
import type { Park } from "@/generated/prisma/client";
import { createAssetsAction, updateAssetAction } from "@/features/assets/actions";
import type { ActionState } from "@/features/assets/types";
import type { AssetWithPark } from "@/features/assets/repository";
import {
  ASSET_STATUS_LABELS,
  ASSET_STATUSES,
  ASSET_TYPE_LABELS,
  ASSET_TYPES,
} from "@/features/assets/constants";
import { Button } from "@/shared/ui/Button";

export interface AssetFormProps {
  parks: Park[];
  mode: "create" | "edit";
  asset?: AssetWithPark;
}

const INITIAL_STATE: ActionState = { ok: false };

function toDateInputValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

export function AssetForm({ parks, mode, asset }: AssetFormProps) {
  const action = mode === "create" ? createAssetsAction : updateAssetAction;
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      {mode === "edit" && asset && (
        <>
          <input type="hidden" name="id" value={asset.id} />
          <div className="flex flex-col gap-1">
            <label htmlFor="code" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Kod
            </label>
            <input
              id="code"
              value={asset.code}
              disabled
              className="min-h-11 rounded border border-zinc-300 bg-zinc-100 px-3 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
            />
          </div>
        </>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="parkId" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Park
        </label>
        <select
          id="parkId"
          name="parkId"
          defaultValue={asset?.parkId ?? ""}
          className="min-h-11 rounded border border-zinc-300 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          required
        >
          <option value="" disabled>
            Seçin
          </option>
          {parks.map((park) => (
            <option key={park.id} value={park.id}>
              {park.name}
            </option>
          ))}
        </select>
        {errors.parkId && <p className="text-sm text-red-600">{errors.parkId[0]}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="type" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Tür
        </label>
        <select
          id="type"
          name="type"
          defaultValue={asset?.type ?? ""}
          className="min-h-11 rounded border border-zinc-300 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          required
        >
          <option value="" disabled>
            Seçin
          </option>
          {ASSET_TYPES.map((type) => (
            <option key={type} value={type}>
              {ASSET_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        {errors.type && <p className="text-sm text-red-600">{errors.type[0]}</p>}
      </div>

      {mode === "create" ? (
        <div className="flex flex-col gap-1">
          <label htmlFor="count" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Adet
          </label>
          <input
            id="count"
            name="count"
            type="number"
            min={1}
            max={100}
            defaultValue={1}
            className="min-h-11 rounded border border-zinc-300 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          {errors.count && <p className="text-sm text-red-600">{errors.count[0]}</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <label htmlFor="status" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Durum
          </label>
          <select
            id="status"
            name="status"
            defaultValue={asset?.status ?? "AKTIF"}
            className="min-h-11 rounded border border-zinc-300 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            required
          >
            {ASSET_STATUSES.map((status) => (
              <option key={status} value={status}>
                {ASSET_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          {errors.status && <p className="text-sm text-red-600">{errors.status[0]}</p>}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="label" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Etiket / Konum notu
        </label>
        <input
          id="label"
          name="label"
          type="text"
          maxLength={120}
          defaultValue={asset?.label ?? ""}
          placeholder="Doğu girişi, 3. bank"
          className="min-h-11 rounded border border-zinc-300 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        {errors.label && <p className="text-sm text-red-600">{errors.label[0]}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="brand" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Marka
        </label>
        <input
          id="brand"
          name="brand"
          type="text"
          maxLength={120}
          defaultValue={asset?.brand ?? ""}
          className="min-h-11 rounded border border-zinc-300 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        {errors.brand && <p className="text-sm text-red-600">{errors.brand[0]}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="installedAt" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Montaj Tarihi
        </label>
        <input
          id="installedAt"
          name="installedAt"
          type="date"
          defaultValue={toDateInputValue(asset?.installedAt)}
          className="min-h-11 rounded border border-zinc-300 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        {errors.installedAt && <p className="text-sm text-red-600">{errors.installedAt[0]}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="latitude" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Enlem
          </label>
          <input
            id="latitude"
            name="latitude"
            type="text"
            inputMode="decimal"
            defaultValue={asset?.latitude ?? ""}
            className="min-h-11 rounded border border-zinc-300 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          {errors.latitude && <p className="text-sm text-red-600">{errors.latitude[0]}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="longitude" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Boylam
          </label>
          <input
            id="longitude"
            name="longitude"
            type="text"
            inputMode="decimal"
            defaultValue={asset?.longitude ?? ""}
            className="min-h-11 rounded border border-zinc-300 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          {errors.longitude && <p className="text-sm text-red-600">{errors.longitude[0]}</p>}
        </div>
      </div>

      {state.message && (
        <p
          role="status"
          aria-live="polite"
          className={state.ok ? "text-sm text-green-700 dark:text-green-500" : "text-sm text-red-600"}
        >
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Kaydediliyor…" : mode === "create" ? "Demirbaş Ekle" : "Kaydet"}
      </Button>
    </form>
  );
}
