import { mkdirSync, writeFileSync } from 'node:fs';
import { renderCompatCss, renderTokensCss } from './src/css.ts';

writeFileSync(new URL('./src/tokens.css', import.meta.url), renderTokensCss());
mkdirSync(new URL('./src/compat/', import.meta.url), { recursive: true });
writeFileSync(new URL('./src/compat/nextudio.css', import.meta.url), renderCompatCss());
console.log('Escritos src/tokens.css y src/compat/nextudio.css');
