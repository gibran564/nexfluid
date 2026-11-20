'use client';

/**
 * NexAvatar: la identidad de una persona (o de un espacio) en una membrana.
 *
 * Imagen cuando la hay; si falta o no carga, las iniciales sobre un tono que
 * sale del nombre (siempre el mismo para el mismo nombre, y siempre una pareja
 * de tokens con contraste verificado: nunca un color inventado). La forma es
 * la de la dirección activa: `circle` es la cápsula de los controles y
 * `membrane` la superelipse de las superficies (espacios, cursos, equipos).
 *
 * Decorativo por defecto: casi siempre el nombre está escrito al lado, y
 * repetirlo sólo añade ruido al lector de pantalla. Con `decorative={false}`
 * se anuncia como imagen con el nombre.
 */
import { useEffect, useRef, useState, type CSSProperties, type HTMLAttributes } from 'react';
import { cx } from '@nexfluid/components';

export type NexAvatarSize = 'small' | 'medium' | 'large';

export interface NexAvatarProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Nombre de quien representa: iniciales, tono y nombre accesible. */
  name: string;
  /** URL de la imagen. Sin ella, o si falla al cargar, iniciales. */
  src?: string | null;
  /** `small` 28 px · `medium` 36 px · `large` 48 px, o un tamaño en px. */
  size?: NexAvatarSize | number;
  /** `circle` (personas) o `membrane` (espacios: cursos, equipos, proyectos). */
  shape?: 'circle' | 'membrane';
  /** Oculto al lector (por defecto) cuando el nombre ya está escrito al lado. */
  decorative?: boolean;
}

const SIZES: Record<NexAvatarSize, number> = { small: 28, medium: 36, large: 48 };
/** Parejas de tokens (tinta sobre fondo suave) cuyo contraste ya verifica foundation. */
const TONES = ['accent', 'success', 'warning', 'neutral'] as const;

/** Hasta dos iniciales, por grafemas (un acento o un emoji no se parten). */
export function avatarInitials(name: string): string {
  const words = name.trim().split(/\s+/u).filter((word) => /[\p{L}\p{N}]/u.test(word));
  const first = (word: string | undefined) => (word ? (Array.from(word)[0] ?? '') : '');
  const picked = words.length > 1 ? [words[0], words[words.length - 1]] : [words[0]];
  return picked.map(first).join('').toLocaleUpperCase();
}

/** Tono estable por nombre (FNV-1a de 32 bits): el mismo nombre, el mismo tono en servidor y cliente. */
export function avatarTone(name: string): (typeof TONES)[number] {
  let hash = 0x811c9dc5;
  for (const char of name.trim().toLocaleLowerCase()) {
    hash ^= char.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return TONES[hash % TONES.length]!;
}

export function NexAvatar({ name, src, size = 'medium', shape = 'circle', decorative = true, className, style, ...rest }: NexAvatarProps) {
  const [failed, setFailed] = useState(false);
  const image = useRef<HTMLImageElement>(null);
  // Una URL nueva merece otro intento. Una imagen que falló ANTES de hidratar
  // no dispara `onError` en React: se comprueba al montar.
  useEffect(() => {
    const el = image.current;
    setFailed(Boolean(el && el.complete && el.naturalWidth === 0 && el.getAttribute('src')));
  }, [src]);
  const px = typeof size === 'number' ? size : SIZES[size];
  const showImage = Boolean(src) && !failed;
  const a11y = decorative
    ? { 'aria-hidden': true as const }
    : { role: 'img', 'aria-label': name };
  return (
    <span
      {...rest}
      {...a11y}
      className={cx('nx-avatar', className)}
      data-nx-shape={shape}
      data-nx-tone={showImage ? undefined : avatarTone(name)}
      style={{ ...style, '--nx-avatar-size': `${px}px` } as CSSProperties}
    >
      {showImage ? (
        <img ref={image} className="nx-avatar__image" src={src!} alt="" width={px} height={px} loading="lazy" decoding="async" onError={() => setFailed(true)} />
      ) : (
        <span className="nx-avatar__initials">{avatarInitials(name) || '·'}</span>
      )}
    </span>
  );
}
