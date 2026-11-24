'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { NexActionButton } from '../action-button.tsx';
import { NexButton } from '../button.tsx';
import { NexMenu } from '../menu.tsx';
import { NexSegmented } from '../segmented.tsx';
import { NexSurface } from '../surface.tsx';
import { centeredImageCrop, imageGeometry, normalizeImageEdits, originalImageEdits, type NexImageAnnotation, type NexImageCrop, type NexImageEdits, type NexImageFormat, type NexImagePoint } from './model.ts';
import { decodeNexImage, drawNexImage, exportNexImage } from './renderer.ts';

export interface NexImageEditorProps {
  source: Blob;
  initialEdits?: NexImageEdits;
  initialFormat?: NexImageFormat;
  initialQuality?: number;
  label: string;
  onApply: (result: { edits: NexImageEdits; blob: Blob; width: number; height: number; format: NexImageFormat; quality: number }) => void | Promise<void>;
  onCancel: () => void;
}

const tools = [
  { value: 'crop', label: 'Encuadre' },
  { value: 'adjust', label: 'Ajustes' },
  { value: 'annotate', label: 'Anotar' },
] as const;
const cropFields: { id: keyof NexImageCrop; label: string }[] = [
  { id: 'x', label: 'Origen horizontal (%)' }, { id: 'y', label: 'Origen vertical (%)' },
  { id: 'width', label: 'Ancho del recorte (%)' }, { id: 'height', label: 'Alto del recorte (%)' },
];
const filters = [
  { id: 'brightness', label: 'Brillo' }, { id: 'contrast', label: 'Contraste' }, { id: 'saturation', label: 'Saturación' },
] as const;

function fieldValue(value: number) { return Math.round(value * 1000) / 10; }

export function NexImageEditor({ source, initialEdits, initialFormat = 'image/png', initialQuality = .9, label, onApply, onCancel }: NexImageEditorProps) {
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState(() => ({
    past: [] as NexImageEdits[], current: normalizeImageEdits(initialEdits ?? originalImageEdits()), future: [] as NexImageEdits[],
  }));
  const [tool, setTool] = useState('crop');
  const [compare, setCompare] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [format, setFormat] = useState<NexImageFormat>(initialFormat);
  const [quality, setQuality] = useState(Math.max(10, Math.min(100, Math.round(initialQuality * 100))));
  const [saving, setSaving] = useState(false);
  const [annotationType, setAnnotationType] = useState<NexImageAnnotation['type']>('arrow');
  const [annotationLabel, setAnnotationLabel] = useState('');
  const [drawing, setDrawing] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const start = useRef<NexImagePoint | null>(null);
  const edits = history.current;

  useEffect(() => {
    let active = true;
    let resource: ImageBitmap | null = null;
    setBitmap(null);
    setError('');
    void decodeNexImage(source).then((decoded) => {
      if (!active) { decoded.close(); return; }
      resource = decoded;
      setBitmap(decoded);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'No se pudo abrir la imagen.');
    });
    return () => { active = false; resource?.close(); };
  }, [source]);

  useEffect(() => {
    const target = canvas.current;
    if (!bitmap || !target) return;
    const frame = requestAnimationFrame(() => {
      try {
        drawNexImage(target, bitmap, compare ? originalImageEdits() : edits, 960);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'No se pudo dibujar la imagen.');
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [bitmap, compare, edits]);

  function update(patch: Partial<NexImageEdits>) {
    setHistory((h) => ({ past: [...h.past.slice(-39), h.current], current: normalizeImageEdits({ ...h.current, ...patch }), future: [] }));
  }

  function undo() {
    setHistory((h) => h.past.length
      ? { past: h.past.slice(0, -1), current: h.past.at(-1)!, future: [h.current, ...h.future] } : h);
  }

  function redo() {
    setHistory((h) => h.future.length
      ? { past: [...h.past, h.current], current: h.future[0]!, future: h.future.slice(1) } : h);
  }

  function position(event: PointerEvent<HTMLCanvasElement>): NexImagePoint {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
  }

  function addAnnotation(from: NexImagePoint, to: NexImagePoint) {
    if (edits.annotations.length >= 40 || (annotationType === 'label' && !annotationLabel.trim())) return;
    update({ annotations: [...edits.annotations, { type: annotationType, from, to, text: annotationLabel.trim() }] });
    setDrawing(false);
  }

  async function apply() {
    if (!bitmap || saving) return;
    setSaving(true);
    setError('');
    try {
      await onApply({ ...await exportNexImage(bitmap, edits, format, quality / 100), edits, format, quality: quality / 100 });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo aplicar la edición.');
    } finally {
      setSaving(false);
    }
  }
  const size = bitmap ? imageGeometry(bitmap.width, bitmap.height, edits) : null;

  return (
    <NexSurface as="section" kind="content" material="clear" aria-label={label} className="nx-image-editor">
      <div className="nx-image-editor__tools">
        <NexSegmented options={tools} value={tool} onValueChange={(next) => { setTool(next); setDrawing(false); }}
          aria-label="Herramientas de imagen" density="compact" motion="none" />
        <NexMenu label="Historial de imagen" density="compact" align="end" items={[
          { id: 'undo', label: 'Deshacer', disabled: !history.past.length || saving, onSelect: undo },
          { id: 'redo', label: 'Rehacer', disabled: !history.future.length || saving, onSelect: redo },
          { id: 'reset', label: 'Restablecer al original', disabled: saving, onSelect: () => update(originalImageEdits()) },
        ]} />
      </div>
      <div className="nx-image-editor__work">
        <div>
          <div className="nx-image-editor__viewport" role="region" tabIndex={0} aria-label="Área de previsualización y desplazamiento">
            {bitmap ? <canvas ref={canvas} role="img" aria-label={compare ? 'Imagen original' : 'Imagen editada'}
              data-drawing={drawing && !compare ? '' : undefined} style={{ inlineSize: `${zoom}%` }}
              onPointerDown={(event) => {
                if (!drawing || compare || event.button !== 0) return;
                start.current = position(event);
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerUp={(event) => {
                const from = start.current;
                start.current = null;
                if (drawing && !compare && from) addAnnotation(from, position(event));
              }}
              onPointerCancel={() => { start.current = null; }}
            /> : !error && <p role="status">Abriendo imagen…</p>}
          </div>
          <div className="nx-image-editor__tools">
            <NexButton appearance="ghost" density="compact" aria-pressed={compare} onClick={() => setCompare(!compare)}>Ver original</NexButton>
            <label>Zoom <input type="range" min={50} max={200} step={25} value={zoom} onChange={(e) => setZoom(e.currentTarget.valueAsNumber)} /> {zoom} %</label>
            {size && <span>{size.width} × {size.height} px</span>}
          </div>
        </div>
        <div className="nx-image-editor__properties">
          {tool === 'crop' && <>
            <label>Proporción
              <select defaultValue="free" onChange={(e) => {
                if (bitmap && e.currentTarget.value !== 'free') update({ crop: centeredImageCrop(bitmap.width, bitmap.height, Number(e.currentTarget.value)) });
              }}>
                <option value="free">Libre</option><option value="1">1:1</option><option value="1.3333333333333333">4:3</option><option value="1.7777777777777777">16:9</option>
              </select>
            </label>
            <div className="nx-image-editor__values">
              {cropFields.map(({ id, label: field }) => <label key={id}>{field}
                <input type="number" min={id === 'x' || id === 'y' ? 0 : 1} max={100} step="0.1" value={fieldValue(edits.crop[id])}
                  onChange={(e) => update({ crop: { ...edits.crop, [id]: e.currentTarget.valueAsNumber / 100 } })} />
              </label>)}
            </div>
            <div className="nx-image-editor__tools">
              <NexButton density="compact" onClick={() => update({ rotation: ({ 0: 90, 90: 180, 180: 270, 270: 0 } as const)[edits.rotation] })}>Girar 90°</NexButton>
              <NexButton density="compact" aria-pressed={edits.flipX} onClick={() => update({ flipX: !edits.flipX })}>Voltear horizontal</NexButton>
              <NexButton density="compact" aria-pressed={edits.flipY} onClick={() => update({ flipY: !edits.flipY })}>Voltear vertical</NexButton>
            </div>
          </>}
          {tool === 'adjust' && <>
            {filters.map(({ id, label: field }) => <label key={id}>{field} {edits[id]} %
              <input type="range" min={0} max={200} value={edits[id]} onChange={(e) => update({ [id]: e.currentTarget.valueAsNumber })} />
            </label>)}
            <label><input type="checkbox" checked={edits.grayscale} onChange={(e) => update({ grayscale: e.currentTarget.checked })} /> Escala de grises</label>
          </>}
          {tool === 'annotate' && <>
            <label>Anotación <select value={annotationType} onChange={(e) => setAnnotationType(e.currentTarget.value as NexImageAnnotation['type'])}>
              <option value="label">Etiqueta</option><option value="arrow">Flecha</option><option value="rectangle">Región</option>
            </select></label>
            {annotationType === 'label' && <label>Texto <input value={annotationLabel} maxLength={120} onChange={(e) => setAnnotationLabel(e.currentTarget.value)} /></label>}
            <NexButton density="compact" aria-pressed={drawing} disabled={compare} onClick={() => setDrawing(!drawing)}>Marcar sobre la imagen</NexButton>
            {drawing && <p role="status">Arrastra sobre la imagen para colocar la marca.</p>}
            <NexButton density="compact" disabled={compare} onClick={() => addAnnotation({ x: .25, y: .25 }, { x: .75, y: .75 })}>Añadir marca centrada</NexButton>
            {edits.annotations.map((item, index) => <NexButton key={index} density="compact" appearance="ghost"
              onClick={() => update({ annotations: edits.annotations.filter((_, i) => i !== index) })}>
              Quitar {item.type === 'label' ? item.text : item.type === 'arrow' ? 'flecha' : 'región'} {index + 1}
            </NexButton>)}
          </>}
        </div>
      </div>
      <details className="nx-image-editor__export">
        <summary>Formato y resolución de salida</summary>
        <div className="nx-image-editor__values">
          <label>Formato <select value={format} onChange={(e) => setFormat(e.currentTarget.value as NexImageFormat)}>
            <option value="image/png">PNG</option><option value="image/jpeg">JPEG</option><option value="image/webp">WebP</option>
          </select></label>
          <label>Ancho en píxeles <input type="number" min={1} max={4096} placeholder="Automático" value={edits.outputWidth ?? ''}
            onChange={(e) => update({ outputWidth: e.currentTarget.value ? e.currentTarget.valueAsNumber : null })} /></label>
          {format !== 'image/png' && <label>Calidad {quality} % <input type="range" min={10} max={100} value={quality} onChange={(e) => setQuality(e.currentTarget.valueAsNumber)} /></label>}
        </div>
      </details>
      {error && <p role="alert">{error}</p>}
      <div className="nx-image-editor__tools">
        <NexActionButton action={apply} status={saving ? 'pending' : 'idle'} disabled={!bitmap || saving} pendingLabel="Aplicando…" density="compact">Aplicar cambios</NexActionButton>
        <NexButton onClick={onCancel} disabled={saving} appearance="ghost" density="compact">Cancelar</NexButton>
      </div>
    </NexSurface>
  );
}
