import { parseArgs } from 'node:util';
import { mkdir, copyFile, writeFile, access } from 'node:fs/promises';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateMetadata,
  validateRelationships,
  readModelEntries,
} from './catalog-lib.mjs';

const { values } = parseArgs({
  options: {
    file: { type: 'string' },
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string', default: '3D 模型预览。' },
    subtitle: { type: 'string', default: '数码产品档案' },
    parent: { type: 'string' },
    status: { type: 'string' },
    category: { type: 'string' },
    brand: { type: 'string' },
    poster: { type: 'string' },
    units: { type: 'string', default: 'mm' },
    'up-axis': { type: 'string', default: 'z' },
  },
});
if (!values.file || !values.id || !values.name) {
  console.error(
    '用法: pnpm model:add --file /路径/model.glb --id my-model --name "模型名称" [--poster /路径/cover.png]',
  );
  process.exit(1);
}
if (values.parent && values.brand !== undefined)
  throw new Error('配件使用所属产品的品牌，请省略 --brand');
const source = resolve(values.file);
const format = extname(source).toLowerCase();
const metadata = {
  id: values.id,
  name: values.name,
  subtitle: values.subtitle,
  description: values.description,
  preview: `model${format}`,
  order: 100,
  downloads: [{ label: format.slice(1).toUpperCase(), file: `model${format}` }],
  ...(values.parent
    ? { parentId: values.parent }
    : { ownership: { status: values.status ?? 'unknown' } }),
  ...(values.category ? { category: values.category } : {}),
  ...(values.brand ? { brand: values.brand } : {}),
  ...(format === '.stl'
    ? { units: values.units, upAxis: values['up-axis'] }
    : {}),
  ...(values.poster
    ? { poster: `poster${extname(values.poster).toLowerCase()}` }
    : {}),
};
validateMetadata(metadata, values.id);
if (values.parent && values.status)
  throw new Error('配件使用所属产品的状态，请省略 --status');
const modelsDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../public/models',
);
// IDs are shared by products and every accessory, regardless of their folder.
// Validate the entire proposed catalog before creating any directories or files.
const existing = await readModelEntries(modelsDirectory);
validateRelationships([...existing.map((entry) => entry.meta), metadata]);
await access(source);
if (values.poster) await access(resolve(values.poster));
const parentDirectory = values.parent
  ? resolve(modelsDirectory, values.parent, 'accessories')
  : modelsDirectory;
if (values.parent) await mkdir(parentDirectory, { recursive: true });
const destination = resolve(parentDirectory, metadata.id);
// mkdir without recursive deliberately refuses to overwrite an existing model.
await mkdir(destination);
await copyFile(source, resolve(destination, metadata.preview));
if (values.poster)
  await copyFile(resolve(values.poster), resolve(destination, metadata.poster));
await writeFile(
  resolve(destination, 'model.json'),
  JSON.stringify(metadata, null, 2) + '\n',
);
console.log(
  `已添加 ${metadata.name}: ${destination}\n请补充参数规格与拥有记录，再运行 pnpm test、pnpm build 并预览。修改保留在工作分支；明确要求提 PR 后，经过 Codex Code Review 再合并发布。`,
);
