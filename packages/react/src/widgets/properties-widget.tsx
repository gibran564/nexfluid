import { Fragment, type ReactNode } from 'react';
import type { Material } from '@eclipsis/foundation';
import { cx, type NexDensity } from '@eclipsis/components';
import { NexPanel } from '../panel.tsx';

export interface NexProperty {
  label: string;
  value: ReactNode;
}

export interface NexPropertyGroup {
  label?: string;
  items: readonly NexProperty[];
}

/** Lista de definición agrupada (sin superficie). La usan el widget de propiedades y el inspector. */
export function NexPropertyList({ groups }: { groups: readonly NexPropertyGroup[] }) {
  return (
    <>
      {groups.map((group, g) => (
        <Fragment key={group.label ?? g}>
          {group.label && <p className="nx-index">{group.label}</p>}
          <dl className="nx-properties" aria-label={group.label}>
            {group.items.map((item) => (
              <Fragment key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </Fragment>
            ))}
          </dl>
        </Fragment>
      ))}
    </>
  );
}

export interface NexPropertiesWidgetProps {
  title?: string;
  groups?: readonly NexPropertyGroup[];
  items?: readonly NexProperty[];
  material?: Material;
  density?: NexDensity;
  actions?: ReactNode;
  collapsible?: boolean;
  className?: string;
}

/** Panel de propiedades clave → valor: NexPanel + listas de definición. */
export function NexPropertiesWidget({ title = 'Propiedades', groups, items, material = 'raised', density, actions, collapsible, className }: NexPropertiesWidgetProps) {
  return (
    <NexPanel title={title} actions={actions} collapsible={collapsible} material={material} density={density} className={cx('nx-properties-widget', className)}>
      <NexPropertyList groups={groups ?? [{ items: items ?? [] }]} />
    </NexPanel>
  );
}
