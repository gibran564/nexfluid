'use client';

import { useState, type ReactNode } from 'react';
import { cx } from '@nexfluid/components';
import { NexNav, NexNavItem } from '../nav.tsx';

export interface NexExplorerNode {
  id: string;
  label: string;
  icon?: ReactNode;
  trailing?: ReactNode;
  children?: readonly NexExplorerNode[];
}

export interface NexExplorerWidgetProps {
  nodes: readonly NexExplorerNode[];
  'aria-label': string;
  selected?: string;
  defaultSelected?: string;
  onSelect?: (id: string) => void;
  /** Ramas abiertas al inicio. */
  defaultExpanded?: readonly string[];
  className?: string;
}

/**
 * Explorador en árbol: NexNav con ramas plegables y la gota líquida sobre
 * el elemento seleccionado. Las ramas anuncian `aria-expanded`.
 */
export function NexExplorerWidget({ nodes, selected: controlled, defaultSelected, onSelect, defaultExpanded = [], className, ...rest }: NexExplorerWidgetProps) {
  const [inner, setInner] = useState(defaultSelected);
  const selected = controlled ?? inner;
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set(defaultExpanded));
  const select = (id: string) => {
    if (controlled === undefined) setInner(id);
    onSelect?.(id);
  };
  const render = (list: readonly NexExplorerNode[], level: number): ReactNode[] =>
    list.flatMap((n) => {
      const branch = Boolean(n.children?.length);
      const expanded = open.has(n.id);
      const item = (
        <NexNavItem
          key={n.id}
          level={level}
          icon={n.icon}
          trailing={n.trailing}
          current={!branch && n.id === selected}
          expanded={branch ? expanded : undefined}
          onClick={() => {
            if (branch) setOpen((s) => { const next = new Set(s); if (next.has(n.id)) next.delete(n.id); else next.add(n.id); return next; });
            else select(n.id);
          }}
        >
          {n.label}
        </NexNavItem>
      );
      return branch && expanded ? [item, ...render(n.children!, level + 1)] : [item];
    });
  return (
    <NexNav aria-label={rest['aria-label']} className={cx('nx-explorer', className)}>
      {render(nodes, 0)}
    </NexNav>
  );
}
