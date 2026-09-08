import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { readModelEntries, localAsset } from './catalog-lib.mjs';
import { buildThumbnail } from './thumbnails.mjs';

test('catalog covers fit the thumbnail bandwidth budget without cropping or changing originals', async () => {
  const output = await mkdtemp(resolve(tmpdir(), 'gallery-thumbnails-'));
  const models = fileURLToPath(new URL('../public/models/', import.meta.url));
  let total = 0;
  let count = 0;
  try {
    for (const { directory, meta } of await readModelEntries(models)) {
      if (!meta.poster) continue;
      const { path } = await localAsset(directory, meta.poster);
      const original = await readFile(path);
      const before = await sharp(original).metadata();
      const url = await buildThumbnail(path, output);
      const bytes = await readFile(resolve(output, basename(url)));
      const after = await sharp(bytes).metadata();
      assert.equal(after.format, 'webp', meta.id);
      assert.ok(after.width <= 512 && after.height <= 512, meta.id);
      // These authored covers have no EXIF rotation; allow one resized pixel.
      assert.ok(
        Math.abs(after.width - (after.height * before.width) / before.height) <=
          1,
        meta.id,
      );
      assert.ok(
        bytes.length < 128 * 1024,
        `${meta.id}: thumbnail exceeds 128 KiB`,
      );
      assert.deepEqual(await readFile(path), original, meta.id);
      total += bytes.length;
      count++;
    }
    assert.ok(count > 0);
    assert.ok(
      total / count < 64 * 1024,
      'Average cover should stay under 64 KiB',
    );
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test('thumbnail URLs are stable until content changes; small transparent images are not enlarged', async () => {
  const output = await mkdtemp(resolve(tmpdir(), 'gallery-thumbnail-cache-'));
  try {
    const source = resolve(output, 'source.png');
    const makeImage = (r) =>
      sharp({
        create: {
          width: 80,
          height: 40,
          channels: 4,
          background: { r, g: 40, b: 90, alpha: 0.5 },
        },
      })
        .png()
        .toFile(source);
    await makeImage(20);
    const first = await buildThumbnail(source, output);
    assert.equal(await buildThumbnail(source, output), first);
    const info = await sharp(resolve(output, basename(first))).metadata();
    assert.equal(info.width, 80);
    assert.equal(info.height, 40);
    assert.equal(info.hasAlpha, true);
    await makeImage(220);
    assert.notEqual(await buildThumbnail(source, output), first);
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});
