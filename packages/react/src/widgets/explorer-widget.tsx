'use client';

import { useEffect, useRef, useState, type CSSProperties, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from '@nexfluid/components';
import { NexNav, NexNavItem } from '../nav.tsx';
import { NexMenu, type NexMenuItem } from '../menu.tsx';

export interface NexExplorerNode {
  id: string;
  label: string;
  icon?: ReactNode;
  trailing?: ReactNode;
  children?: readonly NexExplorerNode[];
  /** Rama vacía (una carpeta sin archivos): se pinta como rama aunque no tenga hijos. */
  branch?: boolean;
}

/** Un campo en línea para crear un elemento dentro de una rama (o en la raíz con `parent: null`). */
export interface NexExplorerDraft {
  parent: string | null;
  kind: 'leaf' | 'branch';
  /** Nombre accesible del campo («Nombre del archivo nuevo»). */
  label: string;
  placeholder?: string;
}

export interface NexExplorerWidgetProps {
  nodes: readonly NexExplorerNode[];
  'aria-label': string;
  selected?: string;
  defaultSelected?: string;
  onSelect?: (id: string) => void;
  /** Ramas abiertas al inicio. */
  defaultExpanded?: readonly string[];
  /** Ramas abiertas (controlado). */
  expanded?: readonly string[];
  onExpandedChange?: (expanded: string[]) => void;
  /** Acciones de cada fila (menú `⋮`, hermano del elemento: nunca un botón dentro de otro). */
  actions?: (node: NexExplorerNode) => readonly NexMenuItem[];
  /** Elemento que se está renombrando: su etiqueta pasa a ser un campo. */
  renaming?: string | null;
  /** Intro con un nombre nuevo. Devuelve `false` para dejar el campo abierto (nombre no válido). */
  onRenameCommit?: (id: string, label: string) => boolean | void;
  onRenameCancel?: () => void;
  /** F2 sobre un elemento: la aplicación decide si se puede renombrar (y pone `renaming`). */
  onRenameRequest?: (id: string) => void;
  /** Supr sobre un elemento: la aplicación pide confirmación y borra. */
  onDeleteRequest?: (id: string) => void;
  /** Campo para crear un elemento nuevo. */
  draft?: NexExplorerDraft | null;
  onDraftCommit?: (label: string) => boolean | void;
  onDraftCancel?: () => void;
  /** Arrastrar un elemento sobre una rama (o la raíz, `null`) lo mueve. Sin esto no se puede arrastrar. */
  onMove?: (id: string, target: string | null) => void;
  /** Si se puede soltar `id` en `target`. Por defecto, todo menos dentro de sí mismo. */
  canMove?: (id: string, target: string | null) => boolean;
  /** Archivos del sistema soltados sobre una rama (o la raíz). */
  onDropFiles?: (files: FileList, target: string | null) => void;
  className?: string;
}

interface FlatItem {
  node: NexExplorerNode;
  level: number;
  branch: boolean;
}

function isBranch(node: NexExplorerNode): boolean {
  return Boolean(node.branch || node.children?.length);
}

function contains(node: NexExplorerNode, id: string): boolean {
  return node.id === id || Boolean(node.children?.some((child) => contains(child, id)));
}

function find(nodes: readonly NexExplorerNode[], id: string): NexExplorerNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const inner = node.children ? find(node.children, id) : null;
    if (inner) return inner;
  }
  return null;
}

/**
 * Explorador en árbol: NexNav con ramas plegables y la gota líquida sobre el
 * elemento seleccionado. Las ramas anuncian `aria-expanded`.
 *
 * Opcionalmente, un explorador de ARCHIVOS completo, sin conocer archivos: la
 * aplicación decide qué significa cada operación y la valida.
 *
 *  · Crear en línea (`draft`) y renombrar en línea (`renaming`, F2): Intro
 *    confirma, Escape cancela, perder el foco cancela.
 *  · Acciones por fila (`actions`): un `NexMenu` junto al elemento.
 *  · Mover arrastrando (`onMove`) y soltar archivos del sistema (`onDropFiles`)
 *    sobre una rama o la raíz.
 *  · Teclado de árbol: ↑ ↓ entre elementos visibles, → abre o entra, ← cierra o
 *    sube, Inicio / Fin, F2 renombrar, Supr borrar.
 */
export function NexExplorerWidget({
  nodes,
  selected: controlled,
  defaultSelected,
  onSelect,
  defaultExpanded = [],
  expanded: controlledExpanded,
  onExpandedChange,
  actions,
  renaming = null,
  onRenameCommit,
  onRenameCancel,
  onRenameRequest,
  onDeleteRequest,
  draft = null,
  onDraftCommit,
  onDraftCancel,
  onMove,
  canMove,
  onDropFiles,
  className,
  ...rest
}: NexExplorerWidgetProps) {
  const [inner, setInner] = useState(defaultSelected);
  const selected = controlled ?? inner;
  const [innerOpen, setInnerOpen] = useState<ReadonlySet<string>>(() => new Set(defaultExpanded));
  const open: ReadonlySet<string> = controlledExpanded ? new Set(controlledExpanded) : innerOpen;
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null | undefined>(undefined);
  const host = useRef<HTMLDivElement | null>(null);

  const select = (id: string) => {
    if (controlled === undefined) setInner(id);
    onSelect?.(id);
  };
  const setOpen = (next: Set<string>) => {
    if (!controlledExpanded) setInnerOpen(next);
    onExpandedChange?.([...next]);
  };
  const toggle = (id: string, force?: boolean) => {
    const next = new Set(open);
    const want = force ?? !next.has(id);
    if (want) next.add(id);
    else next.delete(id);
    setOpen(next);
  };

  const flat: FlatItem[] = [];
  const walk = (list: readonly NexExplorerNode[], level: number) => {
    for (const node of list) {
      const branch = isBranch(node);
      flat.push({ node, level, branch });
      if (branch && open.has(node.id) && node.children) walk(node.children, level + 1);
    }
  };
  walk(nodes, 0);

  const focusItem = (id: string) => {
    for (const element of host.current?.querySelectorAll<HTMLElement>('[data-nx-explorer-id]') ?? []) {
      if (element.dataset.nxExplorerId === id) {
        element.focus();
        return;
      }
    }
  };

  const onKey = (event: KeyboardEvent<HTMLElement>, item: FlatItem, index: number) => {
    const { node, branch } = item;
    let handled = true;
    switch (event.key) {
      case 'ArrowDown':
        if (flat[index + 1]) focusItem(flat[index + 1]!.node.id);
        break;
      case 'ArrowUp':
        if (flat[index - 1]) focusItem(flat[index - 1]!.node.id);
        break;
      case 'Home':
        if (flat[0]) focusItem(flat[0].node.id);
        break;
      case 'End':
        if (flat.length) focusItem(flat[flat.length - 1]!.node.id);
        break;
      case 'ArrowRight':
        if (branch && !open.has(node.id)) toggle(node.id, true);
        else if (branch && node.children?.[0]) focusItem(node.children[0].id);
        else handled = false;
        break;
      case 'ArrowLeft': {
        if (branch && open.has(node.id)) toggle(node.id, false);
        else {
          for (let i = index - 1; i >= 0; i -= 1) {
            if (flat[i]!.level < item.level) {
              focusItem(flat[i]!.node.id);
              break;
            }
          }
        }
        break;
      }
      case 'F2':
        if (onRenameRequest) onRenameRequest(node.id);
        else handled = false;
        break;
      case 'Delete':
        if (onDeleteRequest) onDeleteRequest(node.id);
        else handled = false;
        break;
      default:
        handled = false;
    }
    if (handled) event.preventDefault();
  };

  const allowed = (id: string, target: string | null) => {
    if (canMove) return canMove(id, target);
    if (target === null) return true;
    const moving = find(nodes, id);
    return !moving || !contains(moving, target);
  };

  const dropHandlers = (target: string | null) => {
    if (!onMove && !onDropFiles) return {};
    return {
      onDragOver: (event: DragEvent) => {
        const files = event.dataTransfer.types.includes('Files');
        if ((files && onDropFiles) || (dragging && onMove && allowed(dragging, target))) {
          event.preventDefault();
          event.stopPropagation();
          setDropTarget(target);
        }
      },
      onDragLeave: () => setDropTarget(undefined),
      onDrop: (event: DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setDropTarget(undefined);
        if (event.dataTransfer.files?.length && onDropFiles) onDropFiles(event.dataTransfer.files, target);
        else if (dragging && onMove && allowed(dragging, target)) onMove(dragging, target);
        setDragging(null);
      },
    };
  };

  const draftField = (parent: string | null, level: number) =>
    draft && draft.parent === parent ? (
      <li key={`draft:${parent ?? ''}`} className="nx-explorer__draft" style={{ '--nx-nav-level': level } as CSSProperties}>
        <InlineName
          label={draft.label}
          placeholder={draft.placeholder}
          initial=""
          onCommit={(value) => onDraftCommit?.(value)}
          onCancel={() => onDraftCancel?.()}
        />
      </li>
    ) : null;

  const rows: ReactNode[] = [];
  flat.forEach((item, index) => {
    const { node, level, branch } = item;
    const expanded = open.has(node.id);
    if (renaming === node.id) {
      rows.push(
        <li key={node.id} className="nx-explorer__draft" style={{ '--nx-nav-level': level } as CSSProperties}>
          <InlineName
            label={`Nuevo nombre de ${node.label}`}
            initial={node.label}
            onCommit={(value) => onRenameCommit?.(node.id, value)}
            onCancel={() => onRenameCancel?.()}
          />
        </li>
      );
    } else {
      const menu = actions?.(node);
      rows.push(
        <NexNavItem
          key={node.id}
          level={level}
          icon={node.icon}
          trailing={node.trailing}
          current={!branch && node.id === selected}
          expanded={branch ? expanded : undefined}
          data-nx-explorer-id={node.id}
          data-nx-drop={branch && dropTarget === node.id ? '' : undefined}
          draggable={onMove ? true : undefined}
          onDragStart={onMove ? (event: DragEvent) => { event.dataTransfer.effectAllowed = 'move'; setDragging(node.id); } : undefined}
          onDragEnd={onMove ? () => { setDragging(null); setDropTarget(undefined); } : undefined}
          {...(branch ? dropHandlers(node.id) : {})}
          onKeyDown={(event: KeyboardEvent<HTMLElement>) => onKey(event, item, index)}
          onClick={() => {
            if (branch) toggle(node.id);
            else select(node.id);
          }}
          aside={menu && menu.length > 0 ? <NexMenu label={`Acciones de ${node.label}`} items={menu} appearance="ghost" align="end" /> : undefined}
        >
          {node.label}
        </NexNavItem>
      );
    }
    // El campo de creación va al principio del contenido de su rama.
    if (branch && expanded) {
      const field = draftField(node.id, level + 1);
      if (field) rows.push(field);
    }
  });

  return (
    <div ref={host} className={cx('nx-explorer', className)} data-nx-drop={dropTarget === null ? '' : undefined} {...dropHandlers(null)}>
      <NexNav aria-label={rest['aria-label']}>
        {draftField(null, 0)}
        {rows}
      </NexNav>
    </div>
  );
}

/** Nombre en línea: Intro confirma, Escape o perder el foco cancela. */
function InlineName({
  label,
  placeholder,
  initial,
  onCommit,
  onCancel,
}: {
  label: string;
  placeholder?: string;
  initial: string;
  onCommit: (value: string) => boolean | void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const field = useRef<HTMLInputElement | null>(null);
  const done = useRef(false);
  useEffect(() => {
    const node = field.current;
    if (!node) return;
    node.focus();
    // Al renombrar se selecciona el nombre sin la extensión, como en un explorador de archivos.
    const dot = initial.lastIndexOf('.');
    node.setSelectionRange(0, dot > 0 ? dot : initial.length);
  }, [initial]);
  return (
    <input
      ref={field}
      className="nx-explorer__input"
      aria-label={label}
      placeholder={placeholder}
      value={value}
      spellCheck={false}
      autoComplete="off"
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
          event.preventDefault();
          const trimmed = value.trim();
          if (!trimmed) return;
          if (onCommit(trimmed) !== false) done.current = true;
        } else if (event.key === 'Escape') {
          event.preventDefault();
          done.current = true;
          onCancel();
        }
      }}
      onBlur={() => {
        if (!done.current) onCancel();
      }}
    />
  );
}
