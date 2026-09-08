import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtemp,
  writeFile,
  readFile,
  copyFile,
  readdir,
  mkdir,
  symlink,
  rm,
} from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { legacyAssets } from './legacy-assets.mjs';
import { resolve } from 'node:path';
import {
  validateMetadata,
  validateRelationships,
  localAsset,
  validateGlb,
  readModelEntries,
  modelDownloads,
} from './catalog-lib.mjs';
import {
  devicesIn,
  accessoriesOf,
  brandsIn,
  filterDevices,
  archiveSelection,
  modelRoute,
} from '../src/archive.ts';

const sample = () => ({
  id: 'test-part',
  name: '测试零件',
  subtitle: '模型',
  description: '说明',
  preview: 'model.stl',
  downloads: [{ label: 'STL', file: 'model.stl' }],
});
test('published dock URLs retain their original files, including cached previews and metadata', async () => {
  const paths = [
    'models/x3-dock/model.stl',
    'models/x3-dock/model.step',
    'models/x3-dock/poster.png',
    'models/x3-dock/model.json',
    'generated/x3-dock-245f031decb0.glb',
  ];
  for (const path of paths) {
    const asset = legacyAssets[path];
    assert.ok(asset, path);
    const file = await readFile(
      new URL('../public/' + asset.source, import.meta.url),
    );
    assert.equal(
      createHash('sha256').update(file).digest('hex'),
      asset.sha256,
      path,
    );
    // Historical generated assets must survive the catalog builder's cleanup.
    assert.ok(!asset.source.startsWith('generated/'));
  }
  const preview = legacyAssets[paths.at(-1)];
  await validateGlb(new URL('../public/' + preview.source, import.meta.url));
});
test('download menus include the preview GLB once, normalize formats, and preserve original files', () => {
  const preview = {
    label: 'GLB',
    url: 'generated/dock.glb',
    filename: 'dock.glb',
    bytes: 100,
  };
  const files = [
    { label: 'CAD', url: 'models/dock/a.stp', filename: 'a.stp', bytes: 20 },
    { label: 'Print', url: 'models/dock/a.stl', filename: 'a.stl', bytes: 30 },
    {
      label: 'Source',
      url: 'models/dock/a.blend',
      filename: 'a.blend',
      bytes: 40,
    },
  ];
  const result = modelDownloads(files, preview);
  assert.deepEqual(
    result.map((file) => file.label),
    ['GLB', 'Blender', 'STL', 'STEP'],
  );
  assert.deepEqual(
    result
      .slice(1)
      .map(({ url, filename, bytes }) => ({ url, filename, bytes })),
    [...files]
      .reverse()
      .map(({ url, filename, bytes }) => ({ url, filename, bytes })),
  );
  assert.equal(files[0].label, 'CAD');
  assert.equal(modelDownloads([preview, ...files, preview], preview).length, 4);
  assert.deepEqual(modelDownloads([], preview), [preview]);
  // Different files with the same format remain separately downloadable.
  assert.equal(
    modelDownloads([{ ...preview, url: 'models/alternate.glb' }], preview)
      .length,
    2,
  );
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

test('model:add rejects global ID collisions and invalid parents before writing files', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'gallery-cli-collision-'));
  try {
    const scripts = resolve(root, 'scripts');
    const models = resolve(root, 'public/models');
    await mkdir(scripts);
    for (const name of ['add-model.mjs', 'catalog-lib.mjs'])
      await copyFile(new URL(name, import.meta.url), resolve(scripts, name));
    for (const id of ['reader', 'phone']) {
      await mkdir(resolve(models, id), { recursive: true });
      await writeFile(
        resolve(models, id, 'model.json'),
        JSON.stringify({ ...sample(), id }),
      );
    }
    const dockDir = resolve(models, 'reader/accessories/dock');
    await mkdir(dockDir, { recursive: true });
    await writeFile(
      resolve(dockDir, 'model.json'),
      JSON.stringify({ ...sample(), id: 'dock', parentId: 'reader' }),
    );
    const source = resolve(root, 'source.stl');
    await writeFile(source, 'solid sample\nendsolid sample\n');
    const before = (await readdir(models, { recursive: true })).sort();
    for (const [id, parent, error] of [
      ['dock', 'phone', /ID 不能重复/],
      ['reader', 'phone', /ID 不能重复/],
      ['dock', undefined, /ID 不能重复/],
      ['reader', undefined, /ID 不能重复/],
      ['unique', 'dock', /不能嵌套/],
      ['unique', 'missing', /不存在/],
    ]) {
      const result = spawnSync(
        process.execPath,
        [
          resolve(scripts, 'add-model.mjs'),
          '--file',
          source,
          '--id',
          id,
          '--name',
          'New model',
          ...(parent ? ['--parent', parent] : []),
        ],
        { encoding: 'utf8' },
      );
      assert.equal(result.status, 1);
      assert.match(result.stderr, error);
      assert.deepEqual(
        (await readdir(models, { recursive: true })).sort(),
        before,
      );
    }
    const valid = spawnSync(
      process.execPath,
      [
        resolve(scripts, 'add-model.mjs'),
        '--file',
        source,
        '--id',
        'phone-dock',
        '--name',
        'Phone dock',
        '--parent',
        'phone',
      ],
      { encoding: 'utf8' },
    );
    assert.equal(valid.status, 0, valid.stderr);
    assert.equal((await readModelEntries(models)).length, 4);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('accessory brands are inherited and invalid CLI options create no model files', async () => {
  const accessory = { ...sample(), parentId: 'reader' };
  assert.doesNotThrow(() => validateMetadata(accessory, accessory.id));
  for (const brand of ['Reader Brand', 'Another Brand', '']) {
    assert.throws(
      () => validateMetadata({ ...accessory, brand }, accessory.id),
      /配件沿用所属产品的品牌/,
    );
  }
  const root = await mkdtemp(resolve(tmpdir(), 'model-gallery-cli-'));
  try {
    const scripts = resolve(root, 'scripts');
    const models = resolve(root, 'public/models');
    await mkdir(scripts);
    await mkdir(resolve(models, 'reader'), { recursive: true });
    for (const name of ['add-model.mjs', 'catalog-lib.mjs']) {
      await copyFile(new URL(name, import.meta.url), resolve(scripts, name));
    }
    await writeFile(
      resolve(models, 'reader/model.json'),
      JSON.stringify({ ...sample(), id: 'reader', brand: 'Reader Brand' }),
    );
    const source = resolve(root, 'source.stl');
    await writeFile(source, 'solid sample\nendsolid sample\n');
    const args = [
      resolve(scripts, 'add-model.mjs'),
      '--file',
      source,
      '--id',
      'dock',
      '--name',
      'Dock',
      '--parent',
      'reader',
    ];
    const rejected = spawnSync(
      process.execPath,
      [...args, '--brand', 'Another Brand'],
      {
        encoding: 'utf8',
      },
    );
    assert.equal(rejected.status, 1);
    assert.match(rejected.stderr, /请省略 --brand/);
    assert.deepEqual(await readdir(models), ['reader']);

    const accepted = spawnSync(process.execPath, args, { encoding: 'utf8' });
    assert.equal(accepted.status, 0, accepted.stderr);
    const added = JSON.parse(
      await readFile(
        resolve(models, 'reader/accessories/dock/model.json'),
        'utf8',
      ),
    );
    assert.equal(added.parentId, 'reader');
    assert.equal(added.brand, undefined);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('source verification dates reject rolled-over calendar days and accept real leap days', (t) => {
  t.mock.timers.enable({
    apis: ['Date'],
    now: new Date('2026-09-07T12:00:00Z'),
  });
  const metadata = (checkedAt) => ({
    ...sample(),
    specSources: [
      { label: 'Official source', url: 'https://example.com/specs', checkedAt },
    ],
  });
  for (const date of ['2024-02-29', '2000-02-29', '2026-04-30', '2026-09-07']) {
    assert.doesNotThrow(() => validateMetadata(metadata(date), 'test-part'));
  }
  for (const date of [
    '2026-02-30',
    '2025-02-29',
    '1900-02-29',
    '2026-04-31',
    '2026-13-01',
    '2026-00-01',
    '2026-01-00',
    '2026-1-01',
    '',
    null,
  ]) {
    assert.throws(
      () => validateMetadata(metadata(date), 'test-part'),
      /核对日期/,
    );
  }
});

test('verification dates cannot claim future checks across the UTC day boundary', (t) => {
  t.mock.timers.enable({
    apis: ['Date'],
    now: new Date('2026-09-07T23:59:59Z'),
  });
  const metadata = (checkedAt) => ({
    ...sample(),
    specSources: [
      { label: '官方规格', url: 'https://example.com/specs', checkedAt },
    ],
  });
  assert.doesNotThrow(() =>
    validateMetadata(metadata('2026-09-07'), 'test-part'),
  );
  assert.throws(
    () => validateMetadata(metadata('2026-09-08'), 'test-part'),
    /不能晚于当前 UTC 日期/,
  );
  assert.throws(
    () => validateMetadata(metadata('2099-01-01'), 'test-part'),
    /不能晚于当前 UTC 日期/,
  );
  t.mock.timers.setTime(new Date('2026-09-08T00:00:00Z').getTime());
  assert.doesNotThrow(() =>
    validateMetadata(metadata('2026-09-08'), 'test-part'),
  );
});

test('dated source records preserve their declared local day without permitting future checks', (t) => {
  t.mock.timers.enable({
    apis: ['Date'],
    now: new Date('2026-09-07T18:00:00Z'),
  });
  const metadata = (timeZone, checkedAt = '2026-09-08') => ({
    ...sample(),
    specSources: [
      {
        label: '官方资料',
        url: 'https://example.com/specs',
        checkedAt,
        timeZone,
      },
    ],
  });
  assert.doesNotThrow(() =>
    validateMetadata(metadata('Asia/Shanghai'), 'test-part'),
  );
  assert.throws(
    () => validateMetadata(metadata(undefined), 'test-part'),
    /当前 UTC 日期/,
  );
  assert.throws(
    () =>
      validateMetadata(metadata('Asia/Shanghai', '2026-09-09'), 'test-part'),
    /当前 Asia\/Shanghai 日期/,
  );
  for (const zone of ['Invalid/Zone', '', null, 8])
    assert.throws(
      () => validateMetadata(metadata(zone), 'test-part'),
      /有效时区/,
    );
});

test('catalog discovery groups accessories under their owner and rejects mismatched or nested parents', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'gallery-nested-'));
  try {
    const deviceDir = resolve(root, 'reader');
    const accessoryDir = resolve(deviceDir, 'accessories/dock');
    await mkdir(accessoryDir, { recursive: true });
    await writeFile(
      resolve(deviceDir, 'model.json'),
      JSON.stringify({ ...sample(), id: 'reader' }),
    );
    const writeAccessory = (parentId) =>
      writeFile(
        resolve(accessoryDir, 'model.json'),
        JSON.stringify({ ...sample(), id: 'dock', parentId }),
      );
    await writeAccessory('reader');
    const entries = await readModelEntries(root);
    assert.deepEqual(
      entries.map((e) => e.relativePath),
      ['reader', 'reader/accessories/dock'],
    );
    assert.equal(modelRoute(entries[1].meta), 'reader/dock');
    assert.equal(
      archiveSelection(
        entries.map((e) => e.meta),
        'reader/dock',
      ).model.id,
      'dock',
    );
    assert.equal(
      archiveSelection(
        entries.map((e) => e.meta),
        'dock',
      ).model.id,
      'dock',
    );
    assert.equal(
      archiveSelection(
        entries.map((e) => e.meta),
        'wrong/dock',
      ).model.id,
      'reader',
    );
    await writeAccessory('other-reader');
    await assert.rejects(() => readModelEntries(root), /所在产品目录/);
    await writeAccessory('reader');
    await mkdir(resolve(accessoryDir, 'accessories'));
    await assert.rejects(() => readModelEntries(root), /不能嵌套/);
    await rm(resolve(accessoryDir, 'accessories'), { recursive: true });
    await rm(resolve(deviceDir, 'accessories'), { recursive: true });
    await symlink(root, resolve(deviceDir, 'accessories'));
    await assert.rejects(() => readModelEntries(root), /符号链接/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('published specifications require official sources or explicit local accessory provenance', () => {
  const product = {
    ...sample(),
    specGroups: [{ title: '机身', items: [{ label: '重量', value: '58 g' }] }],
  };
  const official = {
    label: '官方规格',
    url: 'https://example.com/specs',
    checkedAt: '2024-02-29',
  };
  const local = {
    kind: 'local-design',
    label: '个人设计及实测记录',
    checkedAt: '2024-02-29',
  };
  for (const specSources of [undefined, []]) {
    assert.throws(
      () => validateMetadata({ ...product, specSources }, product.id),
      /至少需要一项来源/,
    );
    assert.throws(
      () =>
        validateMetadata(
          { ...product, parentId: 'reader', specSources },
          product.id,
        ),
      /至少需要一项来源/,
    );
  }
  assert.doesNotThrow(() =>
    validateMetadata({ ...product, specSources: [official] }, product.id),
  );
  assert.doesNotThrow(() =>
    validateMetadata(
      { ...product, specSources: [{ ...official, kind: 'official' }] },
      product.id,
    ),
  );
  assert.throws(
    () => validateMetadata({ ...product, specSources: [local] }, product.id),
    /仅用于自制配件/,
  );
  const accessory = { ...product, parentId: 'reader' };
  assert.doesNotThrow(() =>
    validateMetadata({ ...accessory, specSources: [official] }, product.id),
  );
  assert.doesNotThrow(() =>
    validateMetadata({ ...accessory, specSources: [local] }, product.id),
  );
  for (const source of [
    { ...local, label: '' },
    { ...local, checkedAt: '2025-02-29' },
    { ...local, url: 'https://example.com' },
    { ...local, kind: 'unknown' },
  ]) {
    assert.throws(() =>
      validateMetadata({ ...accessory, specSources: [source] }, product.id),
    );
  }
  assert.doesNotThrow(() =>
    validateMetadata({ ...sample(), specGroups: [] }, product.id),
  );
});

test('ownership and specifications reject ambiguous values while allowing explicitly unknown data', () => {
  const metadata = {
    ...sample(),
    ownership: {
      status: 'active',
      acquired: '2026年7月',
      specification: '处理器与内存配置\n机身与镜头套装，按实物记录',
    },
    specGroups: [
      { title: '规格', items: [{ label: '存储容量', value: null }] },
    ],
    specSources: [
      {
        label: '官方规格',
        url: 'https://example.com/specs',
        checkedAt: '2024-02-29',
      },
    ],
  };
  assert.doesNotThrow(() => validateMetadata(metadata, metadata.id));
  for (const specification of ['', '  ', 512, ['黑色', '512 GB']]) {
    assert.throws(
      () =>
        validateMetadata(
          { ...metadata, ownership: { status: 'active', specification } },
          metadata.id,
        ),
      /ownership.specification/,
    );
  }
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
test('products sort by purchase date newest first without changing accessory order or input', () => {
  const products = [
    { id: 'unknown', name: '未填写日期' },
    {
      id: 'october',
      name: '十月购入',
      ownership: { status: 'active', acquired: '2025年10月' },
    },
    {
      id: 'july',
      name: '七月购入',
      ownership: { status: 'active', acquired: '2026年7月' },
    },
    {
      id: 'same-july',
      name: '同月购入',
      ownership: { status: 'retired', acquired: '2026-07' },
    },
    {
      id: 'march',
      name: '三月购入',
      ownership: { status: 'active', acquired: '2025年3月' },
    },
    { id: 'first-accessory', parentId: 'march', name: '底座' },
    { id: 'second-accessory', parentId: 'march', name: '转接头' },
    {
      id: 'invalid',
      name: '日期待查',
      ownership: { status: 'unknown', acquired: '不记得了' },
    },
  ];
  const original = structuredClone(products);
  assert.deepEqual(
    devicesIn(products).map((model) => model.id),
    ['july', 'same-july', 'october', 'march', 'unknown', 'invalid'],
  );
  assert.deepEqual(
    filterDevices(products, 'active', '').map((model) => model.id),
    ['july', 'october', 'march'],
  );
  assert.equal(archiveSelection(products, '').device.id, 'july');
  assert.equal(
    archiveSelection(products, 'first-accessory').model.id,
    'first-accessory',
  );
  assert.deepEqual(
    accessoriesOf(products, 'march').map((model) => model.id),
    ['first-accessory', 'second-accessory'],
  );
  assert.deepEqual(products, original);
});

test('purchase sorting supports partial dates and keeps impossible calendar dates last', () => {
  const products = [
    '2024年',
    '2024年2月',
    '2024-02-29',
    '2024年2月28日',
    '2024-02-30',
    '2024年13月',
    '2024年0月',
    '2023-02-29',
  ].map((acquired) => ({
    id: acquired,
    ownership: { status: 'active', acquired },
  }));
  assert.deepEqual(
    devicesIn(products).map((model) => model.id),
    [
      '2024-02-29',
      '2024年2月28日',
      '2024年2月',
      '2024年',
      '2024-02-30',
      '2024年13月',
      '2024年0月',
      '2023-02-29',
    ],
  );
});

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
