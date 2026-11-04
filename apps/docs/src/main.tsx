import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Fuentes de NexFluid Native.
import '@fontsource-variable/bricolage-grotesque/opsz.css';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
// Sólo para la comparación «antes / después» (adaptador de Nextudio).
import '@fontsource-variable/inter';
import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/jetbrains-mono';
// Contrato de estilos de NexFluidUI: tokens, compatibilidad opcional y componentes.
import '@nexfluid/foundation/tokens.css';
import '@nexfluid/foundation/compat/nextudio.css';
import 'katex/dist/katex.min.css';
import '@nexfluid/components/styles.css';
import './reference.css';
import './docs.css';
import { App } from './app.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
