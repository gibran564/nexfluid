import type { ReactNode } from 'react';
import { ComponentPage, type ComponentDoc } from './docs/component-page.tsx';
import { buttonDoc } from './pages/docs-actions.tsx';
import { badgeDoc, cardDoc } from './pages/docs-surfaces.tsx';
import { frameDoc, tabsDoc } from './pages/docs-navigation-layout.tsx';
import { codeBlockDoc, fluidBlobDoc, markdownDoc, markdownWidgetDoc, propertiesWidgetDoc } from './pages/docs-content.tsx';
import { explorerDoc, inspectorDoc, navDoc, panelDoc, previewDoc, segmentedDoc, surfaceDoc } from './pages/docs-new.tsx';
import { ArchitecturePage, InstallPage, RoadmapPage } from './pages/getting-started.tsx';
import { ColorPage, IconsPage, MotionTokensPage, SpacingPage, ThemesPage, TypographyPage } from './pages/foundations.tsx';
import { CoverPage } from './pages/cover.tsx';
import { ComparePage, DirectionsPage, GrammarPage } from './pages/identity.tsx';
import { MotionOverviewPage } from './pages/motion.tsx';
import { MorphStudioPage } from './pages/morph-studio.tsx';
import { PatternsPage, PlaygroundPage } from './pages/patterns.tsx';
import { CompositionLabPage } from './pages/composition-lab.tsx';
import { QualityPage } from './pages/quality.tsx';

export interface PageDef {
  path: string;
  title: string;
  section: string;
  group?: string;
  keywords?: string;
  render: (tab: string | null) => ReactNode;
}

export const COMPONENT_DOCS: readonly ComponentDoc[] = [
  surfaceDoc, buttonDoc, segmentedDoc, badgeDoc, cardDoc, panelDoc, tabsDoc, navDoc, codeBlockDoc, markdownDoc, frameDoc,
  markdownWidgetDoc, propertiesWidgetDoc, inspectorDoc, explorerDoc, previewDoc, fluidBlobDoc,
];

const component = (doc: ComponentDoc, section: string, group?: string, keywords?: string): PageDef => ({
  path: doc.path,
  title: doc.name.replace(/^Nex/, ''),
  section,
  group,
  keywords: `${doc.name} ${keywords ?? ''}`,
  render: (tab) => <ComponentPage key={doc.path} doc={doc} tab={tab} />,
});

export const PAGES: readonly PageDef[] = [
  { path: 'inicio', title: 'Portada', section: 'Inicio', keywords: 'living editorial interfaces manifiesto', render: () => <CoverPage /> },
  { path: 'instalacion', title: 'Instalación', section: 'Inicio', keywords: 'npm import next ssr', render: () => <InstallPage /> },
  { path: 'arquitectura', title: 'Arquitectura', section: 'Inicio', keywords: 'paquetes capas convenciones', render: () => <ArchitecturePage /> },
  { path: 'hoja-de-ruta', title: 'Catálogo y hoja de ruta', section: 'Inicio', keywords: 'roadmap propuestos estado', render: () => <RoadmapPage /> },

  { path: 'identidad/direcciones', title: 'Tres direcciones', section: 'Identidad', keywords: 'fluid editorial living matter kinetic minimal native', render: () => <DirectionsPage /> },
  { path: 'identidad/antes-y-despues', title: 'Antes y después', section: 'Identidad', keywords: 'comparacion nextudio tradicional', render: () => <ComparePage /> },
  { path: 'identidad/gramatica', title: 'Gramática', section: 'Identidad', keywords: 'formas materiales estados fisica membrana', render: () => <GrammarPage /> },

  { path: 'fundamentos/color', title: 'Color', section: 'Fundamentos', keywords: 'paleta contraste tokens', render: () => <ColorPage /> },
  { path: 'fundamentos/tipografia', title: 'Tipografía', section: 'Fundamentos', keywords: 'escala fuentes bricolage geist serif', render: () => <TypographyPage /> },
  { path: 'fundamentos/espacio', title: 'Espacio y densidad', section: 'Fundamentos', keywords: 'spacing breakpoints density costuras', render: () => <SpacingPage /> },
  { path: 'fundamentos/movimiento', title: 'Movimiento', section: 'Fundamentos', keywords: 'motion niveles', render: () => <MotionTokensPage /> },
  { path: 'fundamentos/iconos', title: 'Iconos', section: 'Fundamentos', keywords: 'icons svg', render: () => <IconsPage /> },
  { path: 'fundamentos/temas', title: 'Temas y direcciones', section: 'Fundamentos', keywords: 'themes dark marca', render: () => <ThemesPage /> },

  component(surfaceDoc, 'Componentes', 'Primitiva', 'membrana superficie'),
  component(buttonDoc, 'Componentes', 'Acciones', 'boton icon button'),
  component(segmentedDoc, 'Componentes', 'Acciones', 'selector radio segmentos'),
  component(badgeDoc, 'Componentes', 'Superficies', 'insignia etiqueta estado'),
  component(cardDoc, 'Componentes', 'Superficies', 'tarjeta expandir panel'),
  component(panelDoc, 'Componentes', 'Superficies', 'panel plegable'),
  component(tabsDoc, 'Componentes', 'Navegación', 'pestañas tablist gota'),
  component(navDoc, 'Componentes', 'Navegación', 'navegacion sidebar'),
  component(codeBlockDoc, 'Componentes', 'Contenido', 'codigo resaltado copiar'),
  component(markdownDoc, 'Componentes', 'Contenido', 'markdown gfm avisos'),

  component(frameDoc, 'Layouts', undefined, 'frame marco layout regiones inspector rieles foco'),

  component(markdownWidgetDoc, 'Widgets', undefined, 'documentacion vista previa'),
  component(propertiesWidgetDoc, 'Widgets', undefined, 'propiedades'),
  component(inspectorDoc, 'Widgets', undefined, 'inspector secciones'),
  component(explorerDoc, 'Widgets', undefined, 'explorador arbol archivos'),
  component(previewDoc, 'Widgets', undefined, 'vista previa dispositivo'),

  { path: 'motion', title: 'NexFluid', section: 'Movimiento', keywords: 'motor resortes presets', render: () => <MotionOverviewPage /> },
  { path: 'motion/nexmorph', title: 'NexMorph Studio', section: 'Movimiento', keywords: 'morph transformacion tarjeta panel dock boton marco fisica', render: () => <MorphStudioPage /> },
  component(fluidBlobDoc, 'Movimiento', undefined, 'blob organico'),

  { path: 'patrones', title: 'Patrones para Nextudio', section: 'Patrones', keywords: 'ejemplos', render: () => <PatternsPage /> },
  { path: 'patrones/composition-lab', title: 'Nex Composition Lab', section: 'Patrones', keywords: 'workspace composicion demo', render: () => <CompositionLabPage /> },
  { path: 'calidad', title: 'Accesibilidad y rendimiento', section: 'Patrones', keywords: 'a11y axe rendimiento fps reducido', render: () => <QualityPage /> },

  { path: 'playground', title: 'Banco de componentes', section: 'Playground', keywords: 'probar propiedades', render: () => <PlaygroundPage docs={COMPONENT_DOCS} /> },
];

export const SECTIONS = ['Inicio', 'Identidad', 'Fundamentos', 'Componentes', 'Layouts', 'Widgets', 'Movimiento', 'Patrones', 'Playground'] as const;
