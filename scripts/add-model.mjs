import { parseArgs } from 'node:util';
import { mkdir, copyFile, writeFile, access } from 'node:fs/promises';
import { resolve, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateMetadata } from './catalog-lib.mjs';

const { values } = parseArgs({
  options: {
    file: { type: 'string' },
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string', default: '3D 模型预览。' },
    subtitle: { type: 'string', default: '个人作品' },
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
  ...(format === '.stl'
    ? { units: values.units, upAxis: values['up-axis'] }
    : {}),
  ...(values.poster
    ? { poster: `poster${extname(values.poster).toLowerCase()}` }
    : {}),
};
validateMetadata(metadata, values.id);
await access(source);
if (values.poster) await access(resolve(values.poster));
const destination = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../public/models',
  metadata.id,
);
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
  `已添加 ${metadata.name}: public/models/${basename(destination)}\n运行 pnpm dev 预览，确认后 git add、commit、push 即可发布。`,
);
