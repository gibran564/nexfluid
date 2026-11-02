import { useEffect, useState } from 'react';
import type { MotionMode } from '@eclipsis/core';
import type { NexDensity, NexMotion } from '@eclipsis/react';

export interface DocsSettings {
  theme: string;
  direction: string;
  density: NexDensity;
  motion: NexMotion;
  reducedMotion: MotionMode;
}

const KEY = 'nexdocs-settings-v2';
export const DEFAULT_SETTINGS: DocsSettings = { theme: 'editorial-light', direction: 'native', density: 'comfortable', motion: 'fluid', reducedMotion: 'system' };

function read(): DocsSettings {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<DocsSettings> | null;
    return { ...DEFAULT_SETTINGS, ...stored };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Preferencias del lector. Sólo comodidad local: si el almacenamiento falla, se usan las de por defecto. */
export function useSettings(): [DocsSettings, (patch: Partial<DocsSettings>) => void] {
  const [settings, setSettings] = useState(read);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      /* navegación privada o almacenamiento bloqueado */
    }
  }, [settings]);
  return [settings, (patch) => setSettings((s) => ({ ...s, ...patch }))];
}
