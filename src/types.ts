export interface DownloadFile {
  label: string;
  url: string;
  filename: string;
  bytes: number;
}
export type OwnershipStatus = 'active' | 'retired' | 'unknown';
export type ArchiveFilter = 'all' | OwnershipStatus;
export interface Ownership {
  status: OwnershipStatus;
  acquired?: string;
  retired?: string;
  specification?: string;
  // Older archives may still use separate color/configuration fields.
  color?: string;
  configuration?: string;
  configurationLabel?: string;
  memory?: string;
}
export interface SpecificationGroup {
  title: string;
  items: { label: string; value: string | null }[];
}
interface SpecificationSourceRecord {
  label: string;
  checkedAt: string;
  timeZone?: string;
}
export type SpecificationSource = SpecificationSourceRecord &
  ({ kind?: 'official'; url: string } | { kind: 'local-design'; url?: never });
export interface GalleryModel {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  dimensions?: string;
  revision?: string;
  preview: string;
  poster?: string;
  cameraOrbit: string;
  downloads: DownloadFile[];
  note?: string;
  source?: { label: string; url: string };
  parentId?: string;
  category?: string;
  brand?: string;
  ownership?: Ownership;
  specGroups?: SpecificationGroup[];
  specSources?: SpecificationSource[];
}
export const statusLabels: Record<OwnershipStatus, string> = {
  active: '在役',
  retired: '已退役',
  unknown: '状态待确认',
};
export const repositoryUrl = 'https://github.com/deanxizian/model-gallery';
export const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`;
