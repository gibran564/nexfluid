import assert from 'node:assert/strict';
import { test } from 'node:test';
import { centeredImageCrop, imageGeometry, normalizeImageEdits, originalImageEdits } from '../src/image/model.ts';

test('crops in original coordinates before rotating and retains export proportions', () => {
  const crop = centeredImageCrop(1200, 800, 1);
  assert.ok(Math.abs(crop.x - 1 / 6) < 1e-9);
  assert.deepEqual(imageGeometry(1200, 800, { ...originalImageEdits(), crop, rotation: 90, outputWidth: 400 }),
    { x: 200, y: 0, cropWidth: 800, cropHeight: 800, width: 400, height: 400 });
  assert.equal(imageGeometry(1200, 800, { ...originalImageEdits(), rotation: 90 }).width, 800);
});

test('bounds output and normalizes inputs without modifying the original model', () => {
  const edits = originalImageEdits();
  const invalid = { ...edits, crop: { x: NaN, y: .75, width: -1, height: 4 }, saturation: Infinity };
  assert.deepEqual(normalizeImageEdits(invalid).crop, { x: 0, y: .75, width: .01, height: .25 });
  assert.equal(normalizeImageEdits(invalid).saturation, 100);
  assert.equal(imageGeometry(1000, 6000, edits).height, 4096);
  assert.equal(edits.crop.width, 1);
});
