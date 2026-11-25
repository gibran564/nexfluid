import { IMAGE_FORMATS, MAX_IMAGE_PIXELS, MAX_OUTPUT_EDGE, MAX_SOURCE_BYTES, imageGeometry, normalizeImageEdits, type NexImageEdits, type NexImageFormat } from './model.ts';

export async function decodeNexImage(source: Blob): Promise<ImageBitmap> {
  if (!IMAGE_FORMATS.some((format) => source.type === format) || source.size > MAX_SOURCE_BYTES) {
    throw new Error('Elige una imagen PNG, JPEG o WebP de hasta 25 MB.');
  }
  const image = await createImageBitmap(source);
  if (!image.width || !image.height || image.width * image.height > MAX_IMAGE_PIXELS) {
    image.close();
    throw new Error('Esta imagen supera el límite de 24 megapíxeles.');
  }
  return image;
}

export function drawNexImage(canvas: HTMLCanvasElement, bitmap: ImageBitmap, edit: NexImageEdits, edge = MAX_OUTPUT_EDGE): void {
  const edits = normalizeImageEdits(edit);
  const size = imageGeometry(bitmap.width, bitmap.height, edits, edge);
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('La edición 2D no está disponible en este navegador.');
  const sideways = edits.rotation === 90 || edits.rotation === 270;
  const w = sideways ? size.height : size.width;
  const h = sideways ? size.width : size.height;
  context.save();
  context.translate(size.width / 2, size.height / 2);
  context.rotate(edits.rotation * Math.PI / 180);
  context.scale(edits.flipX ? -1 : 1, edits.flipY ? -1 : 1);
  context.drawImage(bitmap, size.x, size.y, size.cropWidth, size.cropHeight, -w / 2, -h / 2, w, h);
  context.restore();

  if (edits.brightness !== 100 || edits.contrast !== 100 || edits.saturation !== 100 || edits.grayscale) {
    const pixels = context.getImageData(0, 0, size.width, size.height);
    const brightness = edits.brightness / 100;
    const contrast = edits.contrast / 100;
    const saturation = edits.grayscale ? 0 : edits.saturation / 100;
    const data = pixels.data;
    for (let i = 0; i < data.length; i += 4) {
      const luminance = .2126 * data[i]! + .7152 * data[i + 1]! + .0722 * data[i + 2]!;
      for (let channel = i; channel < i + 3; channel++) {
        data[channel] = ((luminance + (data[channel]! - luminance) * saturation) * brightness - 128) * contrast + 128;
      }
    }
    context.putImageData(pixels, 0, 0);
  }

  const stroke = Math.max(2, Math.min(size.width, size.height) * .009);
  context.strokeStyle = '#ffcb38';
  context.fillStyle = '#ffcb38';
  context.lineWidth = stroke;
  context.lineCap = 'round';
  context.font = `bold ${Math.max(12, stroke * 4)}px system-ui`;
  context.textBaseline = 'top';
  for (const item of edits.annotations) {
    const x = item.from.x * size.width;
    const y = item.from.y * size.height;
    const toX = item.to.x * size.width;
    const toY = item.to.y * size.height;
    if (item.type === 'label') {
      context.save();
      context.strokeStyle = '#202020';
      context.strokeText(item.text, x, y, Math.max(1, size.width - x));
      context.fillText(item.text, x, y, Math.max(1, size.width - x));
      context.restore();
    } else if (item.type === 'rectangle') {
      context.strokeRect(x, y, toX - x, toY - y);
    } else {
      const angle = Math.atan2(toY - y, toX - x);
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(toX, toY);
      for (const side of [-1, 1]) {
        const wing = angle + side * Math.PI / 6;
        context.moveTo(toX, toY);
        context.lineTo(toX - stroke * 4 * Math.cos(wing), toY - stroke * 4 * Math.sin(wing));
      }
      context.stroke();
    }
  }
}

export async function exportNexImage(bitmap: ImageBitmap, edits: NexImageEdits, type: NexImageFormat, quality: number) {
  const canvas = document.createElement('canvas');
  try {
    drawNexImage(canvas, bitmap, edits);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
    if (!blob || blob.type !== type) throw new Error('El navegador no pudo exportar este formato.');
    return { blob, width: canvas.width, height: canvas.height };
  } finally {
    canvas.width = canvas.height = 0;
  }
}
