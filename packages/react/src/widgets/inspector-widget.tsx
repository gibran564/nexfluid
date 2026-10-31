import type { ReactNode } from 'react';
import { cx, type NexDensity } from '@nexfluid/components';
import { NexPanel } from '../panel.tsx';
import { NexPropertyList, type NexPropertyGroup } from './properties-widget.tsx';

export interface NexInspectorSection {
  id: string;
  title: string;
  /** Pares clave → valor; o contenido libre en `content` (controles, selectores). */
  groups?: readonly NexPropertyGroup[];
  content?: ReactNode;
  defaultOpen?: boolean;
}

export interface NexInspectorWidgetProps {
  sections: readonly NexInspectorSection[];
  density?: NexDensity;
  className?: string;
  'aria-label'?: string;
}

/** Inspector: pila de NexPanel plegables. Cada sección cede y se recupera sin desmontar su contenido. */
export function NexInspectorWidget({ sections, density = 'compact', className, ...rest }: NexInspectorWidgetProps) {
  return (
    <div className={cx('nx-inspector', className)} role="group" aria-label={rest['aria-label'] ?? 'Inspector'}>
      {sections.map((s) => (
        <NexPanel key={s.id} title={s.title} collapsible defaultOpen={s.defaultOpen ?? true} density={density} material="base" headingLevel={3}>
          {s.groups && <NexPropertyList groups={s.groups} />}
          {s.content}
        </NexPanel>
      ))}
    </div>
  );
}
