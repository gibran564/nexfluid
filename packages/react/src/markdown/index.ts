/**
 * @nexfluid/react/markdown — entrada aparte para que quien no pinta Markdown
 * no cargue `react-markdown` ni `remark-gfm`.
 */
export { NexMarkdown } from './markdown.tsx';
export type { NexMarkdownProps } from './markdown.tsx';
export { markdownOutline } from './outline.ts';
export type { MarkdownHeading } from './outline.ts';
export { MARKDOWN_MATH_KATEX_OPTIONS, remarkMathDollarGuard, rehypeKatexCached } from './math.ts';
