import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { validateMetadata, localAsset, validateGlb } from './catalog-lib.mjs';

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
