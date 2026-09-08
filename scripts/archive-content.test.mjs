import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { readModelEntries, localAsset } from './catalog-lib.mjs';
import { devicesIn, accessoriesOf } from '../src/archive.ts';

test('product records contain only owned capacities and reference published assets', async () => {
  const entries = await readModelEntries(
    fileURLToPath(new URL('../public/models', import.meta.url)),
  );
  const storageGB = {
    'iphone-17': 512,
    'iphone-13-pro': 256,
    'ipad-pro-m2-12-9': 128,
    'macbook-air-15-m5': 512,
    'apple-watch-series-6': 32,
    'apple-watch-ultra-2': 64,
  };
  const memoryGB = { 'ipad-pro-m2-12-9': 8, 'macbook-air-15-m5': 16 };
  for (const { directory, meta } of entries.filter(
    (entry) => entry.meta.brand === 'Apple',
  )) {
    const product = JSON.parse(
      await readFile(resolve(directory, 'product.json'), 'utf8'),
    );
    const { specifications, configuration, asset } = product;
    assert.equal(specifications.storage_options, undefined, meta.id);
    assert.equal(specifications.configuration_options, undefined, meta.id);
    if (meta.id in storageGB) {
      const expected = { value: storageGB[meta.id], unit: 'GB' };
      assert.deepEqual(configuration.storage, expected, meta.id);
      assert.deepEqual(specifications.storage, expected, meta.id);
    } else assert.equal(configuration.storage, null, meta.id);
    if (meta.id in memoryGB) {
      assert.equal(configuration.memory_gb, memoryGB[meta.id], meta.id);
      assert.equal(specifications.memory_gb, memoryGB[meta.id], meta.id);
    }
    assert.equal(asset.status, 'ready');
    assert.equal(asset.path_base, 'relative_to_product_json');
    assert.equal(asset.glb, meta.preview, meta.id);
    assert.equal(
      asset.blend,
      meta.downloads.find((file) => file.file.endsWith('.blend'))?.file,
      meta.id,
    );
    assert.equal(asset.previews.poster, meta.poster, meta.id);
    // Check every declared file, including nested variant and provenance records.
    async function checkPaths(value) {
      if (
        typeof value === 'string' &&
        /\.(?:glb|blend|png|jpe?g|json|md|stl|step)$/i.test(value)
      )
        await localAsset(directory, value);
      else if (value && typeof value === 'object')
        for (const child of Object.values(value)) await checkPaths(child);
    }
    await checkPaths(asset);
    assert.deepEqual(product.ownership, meta.ownership, meta.id);
  }
});

test('the published archive contains the ten completed Apple models and both X3 accessories', async () => {
  const entries = await readModelEntries(
    fileURLToPath(new URL('../public/models', import.meta.url)),
  );
  const models = entries.map((entry) => entry.meta);
  for (const entry of entries) {
    await localAsset(entry.directory, entry.meta.preview);
    for (const file of entry.meta.downloads)
      await localAsset(entry.directory, file.file);
  }
  const appleIds = [
    'iphone-17',
    'macbook-air-15-m5',
    'apple-watch-ultra-2',
    'studio-display-2026',
    'siri-remote-3',
    'ipad-pro-m2-12-9',
    'iphone-13-pro',
    'apple-watch-series-6',
    'airpods-pro-1',
    'airpods-pro-2-lightning',
  ];
  for (const id of appleIds) {
    const entry = entries.find((entry) => entry.meta.id === id);
    assert.ok(entry, id);
    assert.equal(entry.meta.brand, 'Apple');
    await localAsset(entry.directory, entry.meta.preview);
    for (const download of entry.meta.downloads)
      await localAsset(entry.directory, download.file);
  }
  assert.ok(devicesIn(models).some((model) => model.id === 'xteink-x3'));
  assert.deepEqual(
    accessoriesOf(models, 'xteink-x3')
      .map((model) => model.id)
      .sort(),
    ['x3-dock', 'x3-type-c-adapter'],
  );
  const phone = models.find((model) => model.id === 'iphone-17');
  assert.equal(phone.ownership.specification, '黑色 · 512 GB · 国行');
  assert.equal(phone.ownership.acquired, '2025年10月');
  assert.equal(phone.ownership.status, 'active');
  const ipad = models.find((model) => model.id === 'ipad-pro-m2-12-9');
  assert.equal(
    ipad.specGroups
      .find((group) => group.title === '我的版本')
      .items.find((item) => item.label === '存储容量').value,
    '128 GB',
  );
  // The owner confirmed that only Series 6 and first-generation AirPods Pro are retired.
  assert.equal(ipad.ownership.status, 'active');
  assert.equal(ipad.ownership.acquired, '2024年8月');
});
