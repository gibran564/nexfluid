/**
 * Resaltado ligero de código para NexCodeBlock.
 *
 * Por qué no Monaco/Shiki: Nextudio colorea con el tokenizador de Monaco
 * (`ColorizedCode`), que pesa varios MB y sólo se justifica donde ya hay un
 * editor. Para documentación y widgets basta un tokenizador por expresiones
 * regulares de ~150 líneas. NexCodeBlock acepta además un `highlighter`
 * propio, así que Nextudio puede seguir usando Monaco donde lo tenga cargado.
 *
 * Límites conocidos: no hay análisis sintáctico (plantillas anidadas, regex
 * literales de JS y heredocs de shell se colorean de forma aproximada). El
 * texto nunca se interpreta como HTML: el resultado son tokens de texto.
 */

export type TokenType =
  | 'plain' | 'keyword' | 'string' | 'comment' | 'number' | 'function' | 'type'
  | 'operator' | 'punctuation' | 'tag' | 'attribute' | 'property' | 'constant';

export interface Token {
  type: TokenType;
  text: string;
}

type Rule = [TokenType, RegExp];

const kw = (words: string) => new RegExp(`\\b(?:${words.trim().split(/\s+/).join('|')})\\b`, 'y');

const NUMBER: Rule = ['number', /\b(?:0x[\da-f]+|\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?)\b/iy];
const PUNCT: Rule = ['punctuation', /[{}()[\];,.:]/y];
const OPERATOR: Rule = ['operator', /[=<>!+\-*/%&|^~?]+/y];
const WORD: Rule = ['plain', /[A-Za-z_$][\w$]*/y];

const JS_RULES: Rule[] = [
  ['comment', /\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/y],
  ['string', /`(?:\\[\s\S]|[^`\\])*`?|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?/y],
  ['keyword', kw('import export from as default const let var function return if else for while do switch case break continue new class extends implements interface type enum async await yield try catch finally throw typeof instanceof in of keyof satisfies readonly declare public private protected static void delete')],
  ['constant', kw('true false null undefined this super NaN Infinity')],
  ['tag', /<\/?[A-Za-z][\w.-]*(?=[\s/>])|<\/?>|\/>/y],
  ['type', /\b[A-Z][\w$]*\b/y],
  ['function', /[A-Za-z_$][\w$]*(?=\s*\()/y],
  ['property', /[A-Za-z_$][\w$-]*(?==)/y],
  NUMBER, OPERATOR, PUNCT, WORD,
];

const PY_RULES: Rule[] = [
  ['comment', /#[^\n]*/y],
  ['string', /(?:[rbfu]{0,2})(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?)/iy],
  ['keyword', kw('def class return if elif else for while in not and or is import from as with try except finally raise lambda yield pass break continue global nonlocal assert del async await match case')],
  ['constant', kw('True False None self')],
  ['function', /[A-Za-z_]\w*(?=\s*\()/y],
  ['type', /\b[A-Z]\w*\b/y],
  NUMBER, OPERATOR, PUNCT, WORD,
];

const JSON_RULES: Rule[] = [
  ['property', /"(?:\\.|[^"\\\n])*"(?=\s*:)/y],
  ['string', /"(?:\\.|[^"\\\n])*"?/y],
  ['constant', kw('true false null')],
  NUMBER, PUNCT,
];

const CSS_RULES: Rule[] = [
  ['comment', /\/\*[\s\S]*?(?:\*\/|$)/y],
  ['string', /"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?/y],
  ['property', /--?[a-z][\w-]*(?=\s*:)/iy],
  ['keyword', /@[a-z-]+|!important/iy],
  ['function', /[a-z-]+(?=\()/iy],
  ['number', /-?\d*\.?\d+(?:px|rem|em|%|ms|s|deg|vw|vh|ch|fr|dvh)?/y],
  ['tag', /[.#]?[a-z][\w-]*(?=[^{};]*\{)/iy],
  ['constant', /#[\da-f]{3,8}\b/iy],
  ['punctuation', /[{}();:,]/y],
  WORD,
];

const HTML_RULES: Rule[] = [
  ['comment', /<!--[\s\S]*?(?:-->|$)/y],
  ['tag', /<\/?[a-z][\w:-]*|\/?>/iy],
  ['attribute', /[a-z_:][\w:.-]*(?==)/iy],
  ['string', /"[^"]*"?|'[^']*'?/y],
  ['operator', /=/y],
];

const SHELL_RULES: Rule[] = [
  ['comment', /(?:^|(?<=\s))#[^\n]*/y],
  ['string', /"(?:\\.|[^"\\])*"?|'[^']*'?/y],
  ['keyword', kw('if then else fi for do done while case esac function in export cd')],
  ['function', /(?:^|(?<=[|;&]\s*))(?:npm|npx|node|git|pnpm|yarn|vite|tsc|curl)\b/my],
  ['property', /--?[a-z][\w-]*/iy],
  ['constant', /\$\{?[\w]+\}?/y],
  ['operator', /[|&;<>]+/y],
  WORD,
];

const MD_RULES: Rule[] = [
  ['keyword', /^#{1,6} [^\n]*/my],
  ['string', /`[^`\n]*`?/y],
  ['constant', /\*\*[^*\n]+\*\*|__[^_\n]+__/y],
  ['tag', /\[[^\]\n]*\]\([^)\n]*\)?/y],
  ['operator', /^\s*(?:[-*+]|\d+\.)\s/my],
];

const LANGUAGES: Record<string, Rule[]> = {
  javascript: JS_RULES,
  typescript: JS_RULES,
  python: PY_RULES,
  json: JSON_RULES,
  css: CSS_RULES,
  html: HTML_RULES,
  shell: SHELL_RULES,
  markdown: MD_RULES,
};

const ALIASES: Record<string, string> = {
  js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
  ts: 'typescript', tsx: 'typescript', mts: 'typescript',
  py: 'python', sh: 'shell', bash: 'shell', zsh: 'shell', console: 'shell', ps1: 'shell',
  htm: 'html', xml: 'html', svg: 'html', vue: 'html', md: 'markdown', jsonc: 'json', scss: 'css',
};

export function normalizeLanguage(language: string | null | undefined): string {
  const id = (language ?? '').trim().toLowerCase();
  return ALIASES[id] ?? id;
}

export function isSupportedLanguage(language: string | null | undefined): boolean {
  return normalizeLanguage(language) in LANGUAGES;
}

export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGES);

/** Tokeniza `code`. La concatenación de `text` reproduce siempre el original. */
export function tokenize(code: string, language: string | null | undefined): Token[] {
  const rules = LANGUAGES[normalizeLanguage(language)];
  if (!rules) return code === '' ? [] : [{ type: 'plain', text: code }];
  const out: Token[] = [];
  const push = (type: TokenType, text: string) => {
    const last = out[out.length - 1];
    if (last && last.type === type) last.text += text;
    else out.push({ type, text });
  };
  let i = 0;
  while (i < code.length) {
    let matched = false;
    for (const [type, re] of rules) {
      re.lastIndex = i;
      const m = re.exec(code);
      if (m && m[0].length > 0) {
        push(type, m[0]);
        i += m[0].length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      push('plain', code[i]!);
      i++;
    }
  }
  return out;
}

/** Divide tokens en líneas (para numeración y resaltado de líneas). */
export function splitLines(tokens: readonly Token[]): Token[][] {
  const lines: Token[][] = [[]];
  for (const token of tokens) {
    const parts = token.text.split('\n');
    parts.forEach((part, index) => {
      if (index > 0) lines.push([]);
      if (part) lines[lines.length - 1]!.push({ type: token.type, text: part });
    });
  }
  return lines;
}
