export const MAX_IMAGE_PIXELS = 24_000_000;
export const MAX_OUTPUT_EDGE = 4096;
export const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
export const IMAGE_FORMATS = ['image/png', 'image/jpeg', 'image/webp'] as const;
export type NexImageFormat = typeof IMAGE_FORMATS[number];

export interface NexImageCrop { x: number; y: number; width: number; height: number }
export interface NexImagePoint { x: number; y: number }
export interface NexImageAnnotation {
  type: 'label' | 'arrow' | 'rectangle';
  from: NexImagePoint;
  to: NexImagePoint;
  text: string;
}
export interface NexImageEdits {
  version: 1;
  crop: NexImageCrop;
  rotation: 0 | 90 | 180 | 270;
  flipX: boolean;
  flipY: boolean;
  brightness: number;
  contrast: number;
  saturation: number;
  grayscale: boolean;
  outputWidth: number | null;
  annotations: NexImageAnnotation[];
}

export function originalImageEdits(): NexImageEdits {
  return {
    version: 1, crop: { x: 0, y: 0, width: 1, height: 1 }, rotation: 0, flipX: false,
    flipY: false, brightness: 100, contrast: 100, saturation: 100, grayscale: false,
    outputWidth: null, annotations: [],
  };
}

function clamp(value: number, min: number, max: number, fallback: number): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

export function normalizeImageEdits(edits: NexImageEdits): NexImageEdits {
  const x = clamp(edits.crop.x, 0, .99, 0);
  const y = clamp(edits.crop.y, 0, .99, 0);
  const point = ({ x, y }: NexImagePoint): NexImagePoint => ({ x: clamp(x, 0, 1, 0), y: clamp(y, 0, 1, 0) });
  return {
    ...edits,
    crop: { x, y, width: clamp(edits.crop.width, .01, 1 - x, 1 - x), height: clamp(edits.crop.height, .01, 1 - y, 1 - y) },
    brightness: clamp(edits.brightness, 0, 200, 100),
    contrast: clamp(edits.contrast, 0, 200, 100),
    saturation: clamp(edits.saturation, 0, 200, 100),
    outputWidth: edits.outputWidth === null ? null : Math.round(clamp(edits.outputWidth, 1, MAX_OUTPUT_EDGE, 1)),
    annotations: edits.annotations.slice(0, 40).map((item) => ({ ...item, from: point(item.from), to: point(item.to), text: item.text.slice(0, 120) })),
  };
}

export function imageGeometry(width: number, height: number, edits: NexImageEdits, edge = MAX_OUTPUT_EDGE) {
  const { crop, rotation, outputWidth } = normalizeImageEdits(edits);
  const croppedWidth = Math.max(1, Math.floor(width * crop.width));
  const croppedHeight = Math.max(1, Math.floor(height * crop.height));
  const sideways = rotation === 90 || rotation === 270;
  const rotatedWidth = sideways ? croppedHeight : croppedWidth;
  const rotatedHeight = sideways ? croppedWidth : croppedHeight;
  const scale = Math.min((outputWidth ?? rotatedWidth) / rotatedWidth, edge / Math.max(rotatedWidth, rotatedHeight));
  return {
    x: Math.min(width - croppedWidth, Math.floor(width * crop.x)),
    y: Math.min(height - croppedHeight, Math.floor(height * crop.y)),
    cropWidth: croppedWidth,
    cropHeight: croppedHeight,
    width: Math.max(1, Math.round(rotatedWidth * scale)),
    height: Math.max(1, Math.round(rotatedHeight * scale)),
  };
}

export function centeredImageCrop(width: number, height: number, ratio: number): NexImageCrop {
  const relative = ratio / (width / height);
  const w = Math.min(1, relative);
  const h = Math.min(1, 1 / relative);
  return { x: (1 - w) / 2, y: (1 - h) / 2, width: w, height: h };
}
