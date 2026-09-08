import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { readModelEntries, localAsset } from './catalog-lib.mjs';
import { devicesIn, accessoriesOf } from '../src/archive.ts';

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
