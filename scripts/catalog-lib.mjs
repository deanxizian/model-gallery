import { readFile, stat, realpath } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';

export const supportedDownloads = new Set([
  '.glb',
  '.stl',
  '.step',
  '.stp',
  '.obj',
  '.3mf',
  '.blend',
  '.zip',
]);
export const maxAssetBytes = 95 * 1024 * 1024;

export function validateMetadata(value, folder) {
  if (!value || typeof value !== 'object')
    throw new Error(`${folder}: model.json 必须是对象`);
  for (const field of ['id', 'name', 'subtitle', 'description', 'preview']) {
    if (typeof value[field] !== 'string' || !value[field].trim())
      throw new Error(`${folder}: 缺少 ${field}`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.id) || value.id !== folder)
    throw new Error(
      `${folder}: id 必须与文件夹一致，只能使用小写英文、数字和连字符`,
    );
  if (!['.glb', '.stl'].includes(extname(value.preview).toLowerCase()))
    throw new Error(`${folder}: 预览支持 GLB 或 STL`);
  if (value.units && !['mm', 'cm', 'm'].includes(value.units))
    throw new Error(`${folder}: units 必须是 mm、cm 或 m`);
  if (value.upAxis && !['y', 'z'].includes(value.upAxis))
    throw new Error(`${folder}: upAxis 必须是 y 或 z`);
  if (value.order !== undefined && !Number.isFinite(value.order))
    throw new Error(`${folder}: order 必须是数字`);
  for (const key of [
    'poster',
    'dimensions',
    'revision',
    'note',
    'cameraOrbit',
  ]) {
    if (value[key] !== undefined && typeof value[key] !== 'string')
      throw new Error(`${folder}: ${key} 必须是文本`);
  }
  if (
    value.cameraOrbit &&
    !/^-?\d+(?:\.\d+)?deg \d+(?:\.\d+)?deg \d+(?:\.\d+)?%$/.test(
      value.cameraOrbit,
    )
  )
    throw new Error(`${folder}: cameraOrbit 格式应如 30deg 65deg 100%`);
  if (!Array.isArray(value.downloads) || !value.downloads.length)
    throw new Error(`${folder}: downloads 至少需要一个文件`);
  for (const d of value.downloads) {
    if (
      !d ||
      typeof d.label !== 'string' ||
      !d.label.trim() ||
      typeof d.file !== 'string' ||
      !supportedDownloads.has(extname(d.file).toLowerCase())
    )
      throw new Error(`${folder}: 下载文件格式或名称无效`);
  }
  if (
    value.source &&
    (typeof value.source.label !== 'string' ||
      !/^https:\/\//.test(value.source.url))
  )
    throw new Error(`${folder}: 来源链接需要 HTTPS URL 和 label`);
  return value;
}

export async function localAsset(directory, file) {
  if (
    typeof file !== 'string' ||
    !file ||
    file.includes('\\') ||
    file.split('/').some((p) => p === '..' || p === '.') ||
    file.startsWith('/')
  )
    throw new Error(`无效的模型文件路径: ${file}`);
  const base = await realpath(directory);
  const path = await realpath(resolve(base, file));
  if (!path.startsWith(base + sep))
    throw new Error(`模型文件不能位于本目录之外: ${file}`);
  const info = await stat(path);
  if (!info.isFile() || info.size === 0)
    throw new Error(`模型文件为空或不是文件: ${file}`);
  if (info.size > maxAssetBytes)
    throw new Error(`单个文件请控制在 95 MiB 内: ${file}`);
  return { path, bytes: info.size };
}

export async function validateGlb(path) {
  const bytes = await readFile(path);
  if (
    bytes.length < 20 ||
    bytes.readUInt32LE(0) !== 0x46546c67 ||
    bytes.readUInt32LE(4) !== 2 ||
    bytes.readUInt32LE(8) !== bytes.length
  )
    throw new Error(`不是有效的 GLB 2 文件: ${path}`);
  const jsonLength = bytes.readUInt32LE(12);
  if (bytes.readUInt32LE(16) !== 0x4e4f534a || jsonLength > bytes.length - 20)
    throw new Error(`GLB JSON 区块无效: ${path}`);
  const data = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8'));
  if (!data.meshes?.length) throw new Error(`GLB 没有网格: ${path}`);
  for (const asset of [...(data.buffers ?? []), ...(data.images ?? [])]) {
    if (asset.uri && !asset.uri.startsWith('data:'))
      throw new Error(`请导出包含全部贴图的 GLB: ${path}`);
  }
}
