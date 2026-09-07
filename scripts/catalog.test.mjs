import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import {
  validateMetadata,
  validateRelationships,
  localAsset,
  validateGlb,
} from './catalog-lib.mjs';
import {
  devicesIn,
  accessoriesOf,
  brandsIn,
  filterDevices,
  archiveSelection,
} from '../src/archive.ts';

const sample = () => ({
  id: 'test-part',
  name: '测试零件',
  subtitle: '模型',
  description: '说明',
  preview: 'model.stl',
  downloads: [{ label: 'STL', file: 'model.stl' }],
});
test('adding a supported model accepts usable metadata and rejects unsupported preview formats', () => {
  assert.equal(validateMetadata(sample(), 'test-part').id, 'test-part');
  assert.throws(
    () =>
      validateMetadata({ ...sample(), preview: 'model.blend' }, 'test-part'),
    /预览支持/,
  );
  assert.throws(
    () => validateMetadata({ ...sample(), id: '../outside' }, '../outside'),
    /id 必须/,
  );
  assert.throws(
    () =>
      validateMetadata(
        {
          ...sample(),
          source: { label: 'source', url: 'javascript:alert(1)' },
        },
        'test-part',
      ),
    /HTTPS/,
  );
  assert.throws(
    () => validateMetadata({ ...sample(), units: 'inch' }, 'test-part'),
    /units/,
  );
});
test('missing files, traversal, and symlinks outside the model cannot enter the published catalog', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'model-gallery-test-'));
  try {
    const dir = resolve(root, 'part');
    await mkdir(dir);
    await writeFile(resolve(dir, 'good.stl'), 'solid valid');
    await writeFile(resolve(root, 'outside.stl'), 'outside');
    await symlink(resolve(root, 'outside.stl'), resolve(dir, 'link.stl'));
    assert.equal((await localAsset(dir, 'good.stl')).bytes, 11);
    await assert.rejects(() => localAsset(dir, 'missing.stl'));
    await assert.rejects(() => localAsset(dir, '../outside.stl'));
    await assert.rejects(() => localAsset(dir, 'link.stl'), /本目录之外/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test('a renamed non-GLB file fails validation before deployment', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'model-gallery-test-'));
  try {
    const path = resolve(root, 'model.glb');
    await writeFile(path, 'not a 3d model');
    await assert.rejects(() => validateGlb(path), /GLB 2/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('accessories must belong to an existing device, never themselves or another accessory', () => {
  const device = { id: 'reader' };
  const dock = { id: 'dock', parentId: 'reader' };
  assert.doesNotThrow(() => validateRelationships([device, dock]));
  assert.throws(() => validateRelationships([dock]), /不存在/);
  assert.throws(
    () => validateRelationships([{ id: 'dock', parentId: 'dock' }]),
    /引用自身/,
  );
  assert.throws(
    () =>
      validateRelationships([device, dock, { id: 'cable', parentId: 'dock' }]),
    /不能嵌套/,
  );
  assert.throws(() => validateRelationships([device, device]), /不能重复/);
});

test('ownership and specifications reject ambiguous values while allowing explicitly unknown data', () => {
  const metadata = {
    ...sample(),
    ownership: { status: 'active', acquired: '2026年7月' },
    specGroups: [
      { title: '规格', items: [{ label: '存储容量', value: null }] },
    ],
  };
  assert.doesNotThrow(() => validateMetadata(metadata, metadata.id));
  assert.throws(
    () =>
      validateMetadata(
        { ...metadata, ownership: { status: 'new' } },
        metadata.id,
      ),
    /ownership.status/,
  );
  assert.throws(
    () => validateMetadata({ ...metadata, parentId: 'reader' }, metadata.id),
    /沿用所属产品/,
  );
  assert.throws(
    () =>
      validateMetadata(
        {
          ...metadata,
          specGroups: [
            { title: '规格', items: [{ label: '容量', value: 512 }] },
          ],
        },
        metadata.id,
      ),
    /未知值使用 null/,
  );
  assert.throws(
    () =>
      validateMetadata(
        {
          ...metadata,
          specSources: [
            {
              label: '来源',
              url: 'javascript:alert(1)',
              checkedAt: '2026-09-07',
            },
          ],
        },
        metadata.id,
      ),
    /HTTPS/,
  );
});

const archive = [
  { id: 'dock', parentId: 'reader', name: '充电底座', subtitle: '一体式' },
  {
    id: 'reader',
    name: '阅读器',
    brand: '阅星瞳',
    subtitle: '白色',
    ownership: { status: 'active' },
  },
  {
    id: 'phone',
    name: '旧手机',
    brand: 'Apple',
    subtitle: '黑色',
    ownership: { status: 'retired' },
  },
  { id: 'camera', name: '相机', subtitle: '银色' },
];
test('the archive counts devices and accessory search returns the owner, not a separate entry', () => {
  assert.deepEqual(
    devicesIn(archive).map((model) => model.id),
    ['reader', 'phone', 'camera'],
  );
  assert.deepEqual(
    accessoriesOf(archive, 'reader').map((model) => model.id),
    ['dock'],
  );
  assert.deepEqual(
    filterDevices(archive, 'all', ' 充电底座 ').map((model) => model.id),
    ['reader'],
  );
  assert.deepEqual(
    filterDevices(archive, 'active', '').map((model) => model.id),
    ['reader'],
  );
  assert.deepEqual(
    filterDevices(archive, 'retired', '').map((model) => model.id),
    ['phone'],
  );
  assert.deepEqual(
    filterDevices(archive, 'unknown', '').map((model) => model.id),
    ['camera'],
  );
});

test('legacy accessory links select their owner and filters never display a device outside the result', () => {
  const dock = archiveSelection(archive, 'dock');
  assert.equal(dock.device.id, 'reader');
  assert.equal(dock.model.id, 'dock');
  const retired = archiveSelection(
    archive,
    'dock',
    filterDevices(archive, 'retired', ''),
  );
  assert.equal(retired.device.id, 'phone');
  assert.equal(retired.model.id, 'phone');
  assert.equal(
    archiveSelection(
      archive,
      'dock',
      filterDevices(archive, 'retired', '充电底座'),
    ),
    undefined,
  );
  assert.equal(archiveSelection(archive, 'missing').model.id, 'reader');
});

test('brand tags combine with status and accessory searches using the owning product brand', () => {
  assert.deepEqual(brandsIn(archive), ['阅星瞳', 'Apple']);
  assert.deepEqual(
    filterDevices(archive, 'all', '', 'Apple').map((model) => model.id),
    ['phone'],
  );
  assert.deepEqual(filterDevices(archive, 'active', '', 'Apple'), []);
  assert.deepEqual(
    filterDevices(archive, 'active', '充电底座', '阅星瞳').map(
      (model) => model.id,
    ),
    ['reader'],
  );
  assert.deepEqual(filterDevices(archive, 'all', '充电底座', 'Apple'), []);
});
