import type { ArchiveFilter, GalleryModel } from './types';

export const devicesIn = (models: GalleryModel[]) =>
  models.filter((model) => !model.parentId);

export const accessoriesOf = (models: GalleryModel[], deviceId: string) =>
  models.filter((model) => model.parentId === deviceId);

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
  const requested = models.find((model) => model.id === selectedId);
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
