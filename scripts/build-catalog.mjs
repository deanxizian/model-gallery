import { readdir, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { Document, NodeIO } from '@gltf-transform/core';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { localAsset, validateMetadata, validateGlb } from './catalog-lib.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = resolve(root, 'public');
const modelDir = resolve(publicDir, 'models');
const generatedDir = resolve(publicDir, 'generated');
const url = (id, file) =>
  `models/${id}/${file.split('/').map(encodeURIComponent).join('/')}`;
await rm(generatedDir, { recursive: true, force: true });
await mkdir(generatedDir, { recursive: true });

async function convertStl(source, destination, meta) {
  const bytes = await readFile(source);
  let geometry = new STLLoader().parse(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
  if (
    !geometry.attributes.position?.count ||
    geometry.attributes.position.count % 3
  )
    throw new Error(`${meta.id}: STL 没有有效三角面`);
  for (const p of geometry.attributes.position.array)
    if (!Number.isFinite(p)) throw new Error(`${meta.id}: STL 含无效坐标`);
  // Smooth only preview normals. Original STL bytes remain untouched.
  const normalGeometry = geometry.clone();
  normalGeometry.computeBoundingBox();
  const bounds = normalGeometry.boundingBox;
  const span = Math.max(
    bounds.max.x - bounds.min.x,
    bounds.max.y - bounds.min.y,
    bounds.max.z - bounds.min.z,
  );
  if (!Number.isFinite(span) || span <= 0)
    throw new Error(`${meta.id}: STL 尺寸无效`);
  normalGeometry.center().scale(1000 / span, 1000 / span, 1000 / span);
  const smoothed = toCreasedNormals(normalGeometry, Math.PI / 6);
  geometry.setAttribute('normal', smoothed.attributes.normal.clone());
  normalGeometry.dispose();
  if ((meta.upAxis ?? 'z') === 'z') geometry.rotateX(-Math.PI / 2);
  const scale = { mm: 0.001, cm: 0.01, m: 1 }[meta.units ?? 'mm'];
  geometry.scale(scale, scale, scale);
  const document = new Document();
  const buffer = document.createBuffer();
  const position = document
    .createAccessor()
    .setType('VEC3')
    .setArray(geometry.attributes.position.array)
    .setBuffer(buffer);
  const normal = document
    .createAccessor()
    .setType('VEC3')
    .setArray(geometry.attributes.normal.array)
    .setBuffer(buffer);
  const material = document
    .createMaterial('White matte')
    .setBaseColorFactor([0.68, 0.7, 0.72, 1])
    .setMetallicFactor(0)
    .setRoughnessFactor(0.55);
  const primitive = document
    .createPrimitive()
    .setAttribute('POSITION', position)
    .setAttribute('NORMAL', normal)
    .setMaterial(material);
  const mesh = document.createMesh(meta.name).addPrimitive(primitive);
  document.createScene().addChild(document.createNode(meta.name).setMesh(mesh));
  await new NodeIO().write(destination, document);
  geometry.dispose();
}

const models = [];
for (const entry of (await readdir(modelDir, { withFileTypes: true })).sort(
  (a, b) => a.name.localeCompare(b.name),
)) {
  if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
  const directory = resolve(modelDir, entry.name);
  const meta = validateMetadata(
    JSON.parse(await readFile(resolve(directory, 'model.json'), 'utf8')),
    entry.name,
  );
  const previewFile = await localAsset(directory, meta.preview);
  let preview = url(meta.id, meta.preview);
  if (extname(meta.preview).toLowerCase() === '.stl') {
    const hash = createHash('sha256')
      .update(await readFile(previewFile.path))
      .update(JSON.stringify([meta.units, meta.upAxis]))
      .digest('hex')
      .slice(0, 12);
    const name = `${meta.id}-${hash}.glb`;
    await convertStl(previewFile.path, resolve(generatedDir, name), meta);
    preview = `generated/${name}`;
  } else await validateGlb(previewFile.path);
  let poster;
  if (meta.poster) {
    await localAsset(directory, meta.poster);
    if (
      !['.png', '.jpg', '.jpeg', '.webp', '.avif'].includes(
        extname(meta.poster),
      )
    )
      throw new Error(`${meta.id}: 缩略图需要 PNG、JPG、WebP 或 AVIF`);
    poster = url(meta.id, meta.poster);
  }
  const downloads = [];
  for (const item of meta.downloads) {
    const file = await localAsset(directory, item.file);
    downloads.push({
      label: item.label,
      url: url(meta.id, item.file),
      filename: item.file.split('/').at(-1),
      bytes: file.bytes,
    });
  }
  models.push({
    id: meta.id,
    name: meta.name,
    subtitle: meta.subtitle,
    description: meta.description,
    dimensions: meta.dimensions,
    revision: meta.revision,
    order: meta.order ?? 100,
    preview,
    poster,
    cameraOrbit: meta.cameraOrbit ?? '30deg 65deg 100%',
    downloads,
    note: meta.note,
    source: meta.source,
  });
}
models.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
if (!models.length) throw new Error('请在 public/models 中添加至少一个模型');
await writeFile(
  resolve(publicDir, 'catalog.json'),
  JSON.stringify({ models }, null, 2) + '\n',
);
console.log(`Catalog ready: ${models.map((m) => m.name).join(' / ')}`);
