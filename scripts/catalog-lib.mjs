import { readFile, stat, realpath, readdir, lstat } from 'node:fs/promises';
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

// Every viewer has a downloadable GLB, including previews generated from STL.
// Preserve original file descriptors; normalize common format labels and order.
export function modelDownloads(files, previewGlb) {
  const formats = new Map([
    ['.glb', ['GLB', 0]],
    ['.blend', ['Blender', 1]],
    ['.stl', ['STL', 2]],
    ['.step', ['STEP', 3]],
    ['.stp', ['STEP', 3]],
  ]);
  const seen = new Set();
  return [previewGlb, ...files]
    .filter((file) => {
      if (seen.has(file.url)) return false;
      seen.add(file.url);
      return true;
    })
    .map((file) => ({
      ...file,
      label:
        formats.get(extname(file.filename).toLowerCase())?.[0] ?? file.label,
    }))
    .sort(
      (a, b) =>
        (formats.get(extname(a.filename).toLowerCase())?.[1] ?? 4) -
        (formats.get(extname(b.filename).toLowerCase())?.[1] ?? 4),
    );
}

function isCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

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
    'parentId',
    'category',
    'brand',
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
  if (
    value.parentId !== undefined &&
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.parentId)
  )
    throw new Error(`${folder}: parentId 必须是产品 ID`);
  if (value.parentId && value.brand !== undefined)
    throw new Error(`${folder}: 配件沿用所属产品的品牌，请省略 brand`);
  if (value.ownership !== undefined) {
    const record = value.ownership;
    if (
      !record ||
      typeof record !== 'object' ||
      !['active', 'retired', 'unknown'].includes(record.status)
    )
      throw new Error(
        `${folder}: ownership.status 必须是 active、retired 或 unknown`,
      );
    if (value.parentId)
      throw new Error(`${folder}: 配件沿用所属产品的拥有记录`);
    for (const key of [
      'acquired',
      'retired',
      'specification',
      'color',
      'configuration',
      'configurationLabel',
      'memory',
    ]) {
      if (
        record[key] !== undefined &&
        (typeof record[key] !== 'string' || !record[key].trim())
      )
        throw new Error(
          `${folder}: ownership.${key} 必须是非空文本，未知时省略`,
        );
    }
  }
  if (value.specGroups !== undefined) {
    if (!Array.isArray(value.specGroups))
      throw new Error(`${folder}: specGroups 必须是数组`);
    const titles = new Set();
    for (const group of value.specGroups) {
      if (
        !group ||
        typeof group.title !== 'string' ||
        !group.title.trim() ||
        titles.has(group.title) ||
        !Array.isArray(group.items) ||
        !group.items.length
      )
        throw new Error(`${folder}: 规格分组需要唯一标题及至少一项参数`);
      titles.add(group.title);
      const labels = new Set();
      for (const item of group.items) {
        if (
          !item ||
          typeof item.label !== 'string' ||
          !item.label.trim() ||
          labels.has(item.label) ||
          (item.value !== null &&
            (typeof item.value !== 'string' || !item.value.trim()))
        )
          throw new Error(
            `${folder}: 参数需要唯一名称和文本值，未知值使用 null`,
          );
        labels.add(item.label);
      }
    }
  }
  if (value.specSources !== undefined) {
    if (!Array.isArray(value.specSources))
      throw new Error(`${folder}: specSources 必须是数组`);
    for (const source of value.specSources) {
      const localDesign = source?.kind === 'local-design';
      if (
        source?.kind !== undefined &&
        !['official', 'retailer', 'local-design'].includes(source.kind)
      )
        throw new Error(
          `${folder}: 规格来源 kind 必须是 official、retailer 或 local-design`,
        );
      if (localDesign && (!value.parentId || source.url !== undefined))
        throw new Error(
          `${folder}: local-design 仅用于自制配件，填写说明而非 URL`,
        );
      let link;
      try {
        link = new URL(source?.url);
      } catch {
        /* Report as invalid source below. */
      }
      if (
        !source ||
        typeof source.label !== 'string' ||
        !source.label.trim() ||
        (!localDesign && link?.protocol !== 'https:') ||
        !isCalendarDate(source.checkedAt)
      )
        throw new Error(
          `${folder}: 规格来源需要名称、HTTPS URL 和核对日期 YYYY-MM-DD`,
        );
      let today;
      try {
        if (
          source.timeZone !== undefined &&
          (typeof source.timeZone !== 'string' || !source.timeZone.trim())
        )
          throw new Error('Invalid time zone');
        today = new Intl.DateTimeFormat('en-CA', {
          timeZone: source.timeZone ?? 'UTC',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date());
      } catch {
        throw new Error(`${folder}: 规格来源 timeZone 必须是有效时区`);
      }
      if (source.checkedAt > today)
        throw new Error(
          `${folder}: 规格来源核对日期不能晚于当前 ${source.timeZone ?? 'UTC'} 日期`,
        );
    }
  }
  if (value.specGroups?.length && !value.specSources?.length)
    throw new Error(
      `${folder}: 参数规格至少需要一项来源；产品使用官方来源，自制配件可使用 local-design 记录`,
    );
  return value;
}

export async function readModelEntries(modelDirectory) {
  const entries = [];
  async function collect(directory, relativePath, parentId) {
    const id = relativePath.split('/').at(-1);
    const meta = validateMetadata(
      JSON.parse(await readFile(resolve(directory, 'model.json'), 'utf8')),
      id,
    );
    if (meta.parentId !== parentId)
      throw new Error(`${relativePath}: parentId 必须与所在产品目录一致`);
    entries.push({ directory, relativePath, meta });
  }
  for (const product of await readdir(modelDirectory, {
    withFileTypes: true,
  })) {
    if (product.name.startsWith('.')) continue;
    if (product.isSymbolicLink()) throw new Error('产品目录不能使用符号链接');
    if (!product.isDirectory()) continue;
    const directory = resolve(modelDirectory, product.name);
    await collect(directory, product.name, undefined);
    const accessoriesDir = resolve(directory, 'accessories');
    let accessories;
    try {
      accessories = await readdir(accessoriesDir, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    if ((await lstat(accessoriesDir)).isSymbolicLink())
      throw new Error('配件目录不能使用符号链接');
    for (const accessory of accessories) {
      if (accessory.name.startsWith('.')) continue;
      if (accessory.isSymbolicLink())
        throw new Error('配件目录不能使用符号链接');
      if (!accessory.isDirectory()) continue;
      const accessoryDir = resolve(accessoriesDir, accessory.name);
      if ((await readdir(accessoryDir)).includes('accessories'))
        throw new Error('配件不能嵌套配件');
      await collect(
        accessoryDir,
        `${product.name}/accessories/${accessory.name}`,
        product.name,
      );
    }
  }
  validateRelationships(entries.map((entry) => entry.meta));
  return entries;
}

export function validateRelationships(models) {
  const byId = new Map(models.map((model) => [model.id, model]));
  if (byId.size !== models.length) throw new Error('产品或配件 ID 不能重复');
  for (const model of models) {
    if (!model.parentId) continue;
    const parent = byId.get(model.parentId);
    if (!parent)
      throw new Error(`${model.id}: 所属产品 ${model.parentId} 不存在`);
    if (parent.id === model.id || parent.parentId)
      throw new Error(`${model.id}: 配件必须直接归属产品，不能嵌套或引用自身`);
  }
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
