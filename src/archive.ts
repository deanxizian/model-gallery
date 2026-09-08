import type { ArchiveFilter, GalleryModel, Ownership } from './types';

export function ownedSpecification(ownership?: Ownership) {
  return (
    ownership?.specification ??
    ([ownership?.color, ownership?.configuration].filter(Boolean).join(' · ') ||
      undefined)
  );
}

function acquisitionDateKey(value?: string) {
  const date = value
    ?.trim()
    .replace('年', '-')
    .replace('月', '-')
    .replace(/日$/, '')
    .replace(/-$/, '')
    .match(/^(\d{4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?$/);
  if (!date) return 0;
  const year = Number(date[1]);
  const month = date[2] === undefined ? 0 : Number(date[2]);
  const day = date[3] === undefined ? 0 : Number(date[3]);
  if (
    year < 1000 ||
    (date[2] !== undefined && (month < 1 || month > 12)) ||
    (date[3] !== undefined &&
      (day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()))
  )
    return 0;
  return year * 10000 + month * 100 + day;
}

// Stable sorting preserves the catalog order for equal or unknown dates.
// Accessories retain their own order within their product.
export const devicesIn = (models: GalleryModel[]) =>
  models
    .filter((model) => !model.parentId)
    .sort(
      (a, b) =>
        acquisitionDateKey(b.ownership?.acquired) -
        acquisitionDateKey(a.ownership?.acquired),
    );

export const accessoriesOf = (models: GalleryModel[], deviceId: string) =>
  models.filter((model) => model.parentId === deviceId);

export const modelRoute = (model: GalleryModel) =>
  model.parentId ? `${model.parentId}/${model.id}` : model.id;

export const brandsIn = (models: GalleryModel[]) => [
  ...new Set(
    devicesIn(models).flatMap((model) => (model.brand ? [model.brand] : [])),
  ),
];

export function filterDevices(
  models: GalleryModel[],
  filter: ArchiveFilter,
  query: string,
  brand = '',
) {
  const term = query.trim().toLocaleLowerCase();
  return devicesIn(models).filter((device) => {
    if (brand && device.brand !== brand) return false;
    if (filter !== 'all' && (device.ownership?.status ?? 'unknown') !== filter)
      return false;
    return [device, ...accessoriesOf(models, device.id)].some((model) =>
      [model.id, model.name, model.subtitle, model.category, model.brand]
        .join(' ')
        .toLocaleLowerCase()
        .includes(term),
    );
  });
}

export function archiveSelection(
  models: GalleryModel[],
  selectedId: string,
  visibleDevices = devicesIn(models),
) {
  const requested = models.find(
    (model) => model.id === selectedId || modelRoute(model) === selectedId,
  );
  const device =
    visibleDevices.find(
      (model) => model.id === (requested?.parentId ?? requested?.id),
    ) ?? visibleDevices[0];
  if (!device) return undefined;
  const model =
    requested?.id === device.id || requested?.parentId === device.id
      ? requested
      : device;
  return { device, model };
}
