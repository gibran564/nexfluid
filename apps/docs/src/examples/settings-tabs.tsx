import { NexBadge, NexTab, NexTabs } from '@eclipsis/react';

/** Pestañas verticales con activación manual: un panel de configuración. */
export default function SettingsTabsExample() {
  return (
    <NexTabs defaultValue="appearance" orientation="vertical" activation="manual" motion="fluid">
      <NexTabs.List aria-label="Configuración">
        <NexTab value="profile">Perfil</NexTab>
        <NexTab value="appearance">Apariencia</NexTab>
        <NexTab value="notifications">Notificaciones</NexTab>
        <NexTab value="billing" disabled>Facturación</NexTab>
      </NexTabs.List>
      <NexTabs.Panel value="profile">Nombre, foto y biografía.</NexTabs.Panel>
      <NexTabs.Panel value="appearance">
        Estilo visual <NexBadge tone="accent">NEX Origen</NexBadge>, modo claro u oscuro y tipografía de lectura.
      </NexTabs.Panel>
      <NexTabs.Panel value="notifications">Correo y avisos dentro de la plataforma.</NexTabs.Panel>
      <NexTabs.Panel value="billing">No disponible.</NexTabs.Panel>
    </NexTabs>
  );
}
