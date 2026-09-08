import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

// Keep extra detail for high-density screens and browser zoom while preserving
// the complete render, its proportions and any transparency.
export async function buildThumbnail(source, outputDirectory) {
  const image = await sharp(await readFile(source))
    .autoOrient()
    .resize({
      width: 512,
      height: 512,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 90, effort: 6 })
    .toBuffer();
  // Hash the encoded output so changed images or encoder settings get a new URL.
  const hash = createHash('sha256').update(image).digest('hex').slice(0, 16);
  const filename = `thumbnail-${hash}.webp`;
  await writeFile(resolve(outputDirectory, filename), image);
  return `generated/${filename}`;
}
