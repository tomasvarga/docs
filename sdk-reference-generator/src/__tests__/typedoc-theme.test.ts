import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { processPageContents } = require('../../configs/typedoc-theme.cjs');

// processPageContents strips the first 6 lines of every page
const PREAMBLE = 'stripped\n'.repeat(6);

function fenceLines(text: string): string[] {
  return text.split('\n').filter((line) => line.startsWith('```'));
}

describe('processPageContents', () => {
  it('removes link-style Overrides sections', () => {
    const input =
      PREAMBLE +
      `###### Returns

\`TimeoutError\`

###### Overrides

[\`SandboxError\`](errors.md#sandboxerror).[\`constructor\`](errors.md#constructors)

***
`;

    const output = processPageContents(input);

    expect(output).not.toContain('Overrides');
    expect(output).not.toContain('SandboxError');
    expect(output).toContain('`TimeoutError`');
    expect(output).toContain('***');
  });

  it('removes code-block-style Overrides sections without orphaning fences', () => {
    const input =
      PREAMBLE +
      `###### Returns

\`AuthenticationError\`

###### Overrides

\`\`\`ts
Error.constructor
\`\`\`

***

### BuildError
`;

    const output = processPageContents(input);

    expect(output).not.toContain('Overrides');
    expect(output).not.toContain('Error.constructor');
    expect(fenceLines(output)).toHaveLength(0);
    expect(output).toContain('### BuildError');
  });

  it('removes code-block-style Inherited from sections', () => {
    const input =
      PREAMBLE +
      `###### Inherited from

\`\`\`ts
Error.message
\`\`\`

***
`;

    const output = processPageContents(input);

    expect(output).not.toContain('Inherited from');
    expect(fenceLines(output)).toHaveLength(0);
  });

  it('removes Extends sections but keeps Extended by', () => {
    const input =
      PREAMBLE +
      `#### Extends

- \`SandboxError\`

#### Extended by

- \`GitAuthError\`

#### Constructors
`;

    const output = processPageContents(input);

    expect(output).not.toContain('#### Extends\n');
    expect(output).toContain('#### Extended by');
    expect(output).toContain('- `GitAuthError`');
    expect(output).toContain('#### Constructors');
  });

  it('keeps fences balanced across a page mixing both section styles', () => {
    const input =
      PREAMBLE +
      `### AuthenticationError

#### Constructors

\`\`\`ts
new AuthenticationError(message: string): AuthenticationError
\`\`\`

###### Returns

\`AuthenticationError\`

###### Overrides

\`\`\`ts
Error.constructor
\`\`\`

***

### TimeoutError

#### Constructors

\`\`\`ts
new TimeoutError(message: string): TimeoutError
\`\`\`

###### Overrides

[\`SandboxError\`](errors.md#sandboxerror).[\`constructor\`](errors.md#constructors)

***
`;

    const output = processPageContents(input);

    expect(fenceLines(output)).toHaveLength(4);
    expect(output).toContain('new AuthenticationError');
    expect(output).toContain('new TimeoutError');
    expect(output).not.toContain('Overrides');
  });
});
