export interface DownloadFile {
  label: string;
  url: string;
  filename: string;
  bytes: number;
}
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
}
export const repositoryUrl = 'https://github.com/deanxizian/model-gallery';
export const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`;
