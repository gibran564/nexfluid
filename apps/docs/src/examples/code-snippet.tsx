import { NexCodeBlock } from '@nexfluid/react';

/** Fragmento con archivo, números de línea y líneas destacadas. */
export default function CodeSnippetExample() {
  return (
    <NexCodeBlock
      title="next.config.ts"
      language="ts"
      showLineNumbers
      highlightLines={[4]}
      code={`import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@nexfluid/react', '@nexfluid/components', '@nexfluid/core', '@nexfluid/foundation'],
};

export default config;`}
    />
  );
}
