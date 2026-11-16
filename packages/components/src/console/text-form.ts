/**
 * Cómo se LEE un texto impreso en NexView: como prosa o como texto literal.
 *
 * No se cambia ni un byte (la vista conserva saltos y espacios con
 * `white-space: pre-wrap`); sólo se decide la tipografía. La prosa usa la
 * fuente editorial; lo que depende de la rejilla de caracteres se queda en
 * monoespaciada para no destruir información.
 *
 * Reglas conservadoras y verificables: ante la duda, `literal`. Un metadato
 * tipado del runtime (una tabla, un JSON) nunca pasa por aquí: tiene su propio
 * evento.
 */
export type NexTextForm = 'prose' | 'literal';

/** Caracteres de dibujo de cajas, bloques y braille: tablas, barras, arte. */
const BOX_OR_BLOCK = /[─-▟⠀-⣿]/;
/** Barras de progreso de texto: `[#####     ]`, `|=====>   |`, `███░░`, `45%|`. */
const PROGRESS = /(\[[#=>\-. ]{6,}\])|(\|[#=>\-█ ]{6,}\|)|(\d{1,3}%\s*\|)/;
/** Columnas alineadas: dos o más espacios seguidos ENTRE palabras. */
const ALIGNED = /\S {2,}\S/;
/** Una línea con muchos símbolos y pocas letras: arte ASCII, separadores de tabla. */
function symbolic(line: string): boolean {
  const visible = line.replace(/\s/g, '');
  if (visible.length < 4) return false;
  const symbols = visible.replace(/[\p{L}\p{N}.,;:!?¿¡'"()]/gu, '').length;
  return symbols / visible.length > 0.45;
}

export function textForm(text: string): NexTextForm {
  if (!text.trim()) return 'literal';
  if (text.includes('\t') || BOX_OR_BLOCK.test(text) || PROGRESS.test(text)) return 'literal';
  const lines = text.split('\n').filter((line) => line.trim());
  for (const line of lines) {
    // Código o bloques indentados (4 o más espacios al inicio).
    if (/^ {4,}\S/.test(line)) return 'literal';
    if (ALIGNED.test(line.trim())) return 'literal';
    if (symbolic(line)) return 'literal';
    // Una línea muy larga sin espacios (hash, base64, rutas): mejor en monoespaciada.
    if (line.length > 60 && !/\s/.test(line.trim())) return 'literal';
  }
  // Código impreso: llaves, `def`/`class`, `;` al final de varias líneas.
  const codeLike = lines.filter((line) => /^\s*(def |class |import |from \S+ import|for .+:$|if .+:$|return\b|public |private |function |const |let |var )|[{};]\s*$/.test(line)).length;
  if (codeLike >= 2 || (lines.length > 0 && codeLike / lines.length > 0.5)) return 'literal';
  return 'prose';
}

/**
 * La pregunta de un `input()`: el trozo final sin salto de línea de lo impreso
 * justo antes. Devuelve el texto anterior (intacto) y la pregunta, o `null`
 * si lo impreso termina en salto de línea (no hay pregunta en la misma línea).
 */
export function splitPrompt(text: string): { before: string; prompt: string } | null {
  if (!text || text.endsWith('\n')) return null;
  const cut = text.lastIndexOf('\n');
  const prompt = text.slice(cut + 1);
  if (!prompt.trim() || prompt.length > 300) return null;
  return { before: text.slice(0, cut + 1), prompt };
}

/**
 * El TÍTULO de un programa de consola: su primera línea, cuando el propio
 * programa la escribió como tal. Reglas estrictas (ante la duda, `null`):
 * una sola línea terminada en salto, de 3 a 60 caracteres, en prosa, que no
 * termina en `:` ni `?` (no es una pregunta ni la etiqueta de un dato) ni en
 * `.` (es una frase). Quien lo presenta exige además que el programa pregunte
 * algo después (cabecera de un programa interactivo). Devuelve el título (sin el salto)
 * y el resto, intacto. Nada se inventa: es el texto del programa.
 */
export function leadingTitle(text: string): { title: string; rest: string } | null {
  const cut = text.indexOf('\n');
  if (cut < 0) return null;
  const line = text.slice(0, cut);
  const title = line.trim();
  if (title !== line || title.length < 3 || title.length > 60) return null;
  if (/[:?.,;]$/.test(title) || !/\p{L}/u.test(title)) return null;
  if (textForm(`${line}\n`) !== 'prose') return null;
  return { title, rest: text.slice(cut + 1) };
}

/** `Etiqueta: valor` escrito por el programa (la etiqueta es corta y empieza por letra). */
const FACT = /^(\p{L}[\p{L}\p{N} ()/%.-]{0,31}):[ \t]+(\S.{0,120})$/u;

/**
 * Datos que el programa imprimió como `Etiqueta: valor`, dos o más líneas
 * SEGUIDAS y todas con esa forma (si una no la tiene, no hay datos: texto).
 * Se presentan como lista de definiciones con el MISMO texto; no se renombra,
 * reordena ni calcula nada. `Error:`/`Traceback` no cuentan como dato.
 */
export function factLines(text: string): Array<{ label: string; value: string }> | null {
  const lines = text.replace(/\n$/, '').split('\n');
  if (lines.length < 2) return null;
  const facts: Array<{ label: string; value: string }> = [];
  for (const line of lines) {
    const match = FACT.exec(line);
    if (!match || /^(error|warning|traceback|advertencia)\b/i.test(match[1]!)) return null;
    facts.push({ label: match[1]!, value: match[2]! });
  }
  return facts;
}
