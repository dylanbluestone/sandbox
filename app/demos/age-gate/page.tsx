'use client';

import { useState } from 'react';

import AgeGate, { AgeGateProps } from '@/components/AgeGate';

// ─── Types ────────────────────────────────────────────────────────────────────

type VerificationStatus = 'idle' | 'verified' | 'denied';

interface DemoConfig {
  id: string;
  title: string;
  description: string;
  badge: string;
  badgeColor: string;
  props: AgeGateProps;
  snippet: string;
}

// ─── Demo configurations ──────────────────────────────────────────────────────

function makeDemos(
  statuses: Record<string, VerificationStatus>,
  setStatus: (id: string, s: VerificationStatus) => void
): DemoConfig[] {
  return [
    {
      id: 'age18',
      title: '18+ Verification',
      description: 'Standard age gate for adult content. Most common use case.',
      badge: 'Default',
      badgeColor: 'bg-blue-100 text-blue-700',
      props: {
        minAge: 18,
        onAgeVerified: () => setStatus('age18', 'verified'),
        onAgeDenied: () => setStatus('age18', 'denied'),
      },
      snippet: `<AgeGate
  minAge={18}
  onAgeVerified={() => setAllowed(true)}
  onAgeDenied={() => setAllowed(false)}
/>`,
    },
    {
      id: 'age21',
      title: '21+ Verification',
      description: 'Required for alcohol-related content in the United States.',
      badge: 'Alcohol',
      badgeColor: 'bg-amber-100 text-amber-700',
      props: {
        minAge: 21,
        onAgeVerified: () => setStatus('age21', 'verified'),
        onAgeDenied: () => setStatus('age21', 'denied'),
        submitButtonText: 'Verify Age to Continue',
        errorMessage: 'You must be 21 or older to access this content.',
      },
      snippet: `<AgeGate
  minAge={21}
  onAgeVerified={() => setAllowed(true)}
  onAgeDenied={() => setAllowed(false)}
  submitButtonText="Verify Age to Continue"
  errorMessage="You must be 21 or older to access this content."
/>`,
    },
    {
      id: 'age13',
      title: '13+ Verification',
      description: 'COPPA compliance — services must gate users under 13.',
      badge: 'COPPA',
      badgeColor: 'bg-green-100 text-green-700',
      props: {
        minAge: 13,
        onAgeVerified: () => setStatus('age13', 'verified'),
        onAgeDenied: () => setStatus('age13', 'denied'),
        submitButtonText: 'Confirm Age',
        errorMessage: 'This service is not available to children under 13.',
      },
      snippet: `<AgeGate
  minAge={13}
  onAgeVerified={() => setAllowed(true)}
  onAgeDenied={() => setAllowed(false)}
  submitButtonText="Confirm Age"
  errorMessage="This service is not available to children under 13."
/>`,
    },
    {
      id: 'disabled',
      title: 'Disabled State',
      description:
        'Use the disabled prop while an async operation is in progress (e.g. checking a session).',
      badge: 'Disabled',
      badgeColor: 'bg-gray-100 text-gray-600',
      props: {
        minAge: 18,
        onAgeVerified: () => setStatus('disabled', 'verified'),
        disabled: true,
        submitButtonText: 'Verify Age',
      },
      snippet: `<AgeGate
  minAge={18}
  onAgeVerified={handleVerified}
  disabled={isLoading}
/>`,
    },
    {
      id: 'custom',
      title: 'Custom Error Message',
      description: 'Override the default error text to match your brand voice.',
      badge: 'Custom',
      badgeColor: 'bg-purple-100 text-purple-700',
      props: {
        minAge: 18,
        onAgeVerified: () => setStatus('custom', 'verified'),
        onAgeDenied: () => setStatus('custom', 'denied'),
        errorMessage: "Sorry, you're not old enough to access this content yet.",
        submitButtonText: 'Check My Age',
      },
      snippet: `<AgeGate
  minAge={18}
  onAgeVerified={handleVerified}
  onAgeDenied={handleDenied}
  errorMessage="Sorry, you're not old enough to access this content yet."
  submitButtonText="Check My Age"
/>`,
    },
  ];
}

// ─── Props table data ─────────────────────────────────────────────────────────

const PROPS_TABLE = [
  {
    name: 'minAge',
    type: 'number',
    required: true,
    default: '—',
    description: 'Minimum age the user must meet to pass verification.',
  },
  {
    name: 'onAgeVerified',
    type: '() => void',
    required: true,
    default: '—',
    description: 'Called when the submitted date satisfies the minimum age requirement.',
  },
  {
    name: 'onAgeDenied',
    type: '() => void',
    required: false,
    default: 'undefined',
    description: 'Called when the submitted date does not satisfy the minimum age requirement.',
  },
  {
    name: 'disabled',
    type: 'boolean',
    required: false,
    default: 'false',
    description: 'When true, all form controls are non-interactive.',
  },
  {
    name: 'errorMessage',
    type: 'string',
    required: false,
    default: '"You must be at least {minAge} years old."',
    description: 'Overrides the under-age error message.',
  },
  {
    name: 'submitButtonText',
    type: 'string',
    required: false,
    default: '"Verify Age"',
    description: 'Label for the submit button.',
  },
];

// ─── Code block ───────────────────────────────────────────────────────────────

/**
 * Minimal JSX token coloriser — no external deps.
 * Splits code into tagged segments and applies colours.
 */
function CodeBlock({ code }: { code: string }) {
  // Tokenise line by line so we can apply per-token colours.
  const lines = code.split('\n');

  return (
    <pre className="overflow-x-auto rounded-lg bg-gray-950 p-4 text-xs leading-relaxed">
      <code>
        {lines.map((line, li) => (
          <div key={li}>
            <TokenisedLine line={line} />
          </div>
        ))}
      </code>
    </pre>
  );
}

function TokenisedLine({ line }: { line: string }) {
  // Simple regex-based split: JSX tags, prop names, strings, braces, plain text.
  const parts = tokenise(line);
  return (
    <>
      {parts.map(({ text, kind }, i) => (
        <span key={i} className={tokenColour(kind)}>
          {text}
        </span>
      ))}
    </>
  );
}

type TokenKind = 'tag' | 'prop' | 'string' | 'brace' | 'punct' | 'plain';

function tokenColour(kind: TokenKind): string {
  switch (kind) {
    case 'tag':
      return 'text-blue-400';
    case 'prop':
      return 'text-emerald-400';
    case 'string':
      return 'text-amber-300';
    case 'brace':
      return 'text-gray-500';
    case 'punct':
      return 'text-gray-400';
    default:
      return 'text-gray-300';
  }
}

function tokenise(line: string): { text: string; kind: TokenKind }[] {
  const tokens: { text: string; kind: TokenKind }[] = [];
  let rest = line;

  while (rest.length > 0) {
    // String literals  "..." or '...'
    const strMatch = rest.match(/^(["'][^"']*["'])/);
    if (strMatch) {
      tokens.push({ text: strMatch[1], kind: 'string' });
      rest = rest.slice(strMatch[1].length);
      continue;
    }
    // JSX tags  <Foo  />  >
    const tagMatch = rest.match(/^(<\/?[A-Z][A-Za-z]*|<\/?>|>|\/?>)/);
    if (tagMatch) {
      tokens.push({ text: tagMatch[1], kind: 'tag' });
      rest = rest.slice(tagMatch[1].length);
      continue;
    }
    // Prop names  word=
    const propMatch = rest.match(/^([a-zA-Z][a-zA-Z0-9]*)(?==)/);
    if (propMatch) {
      tokens.push({ text: propMatch[1], kind: 'prop' });
      rest = rest.slice(propMatch[1].length);
      continue;
    }
    // Curly braces
    const braceMatch = rest.match(/^([{}])/);
    if (braceMatch) {
      tokens.push({ text: braceMatch[1], kind: 'brace' });
      rest = rest.slice(1);
      continue;
    }
    // Punctuation  = ( ) ,
    const punctMatch = rest.match(/^([=(),])/);
    if (punctMatch) {
      tokens.push({ text: punctMatch[1], kind: 'punct' });
      rest = rest.slice(1);
      continue;
    }
    // Anything else — consume one char
    tokens.push({ text: rest[0], kind: 'plain' });
    rest = rest.slice(1);
  }

  return tokens;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, onReset }: { status: VerificationStatus; onReset: () => void }) {
  if (status === 'idle') return null;

  const isVerified = status === 'verified';

  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
        isVerified
          ? 'border-green-200 bg-green-50 text-green-800'
          : 'border-red-200 bg-red-50 text-red-800'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">
          {isVerified ? '✓ Age verified' : '✗ Access denied'}
        </span>
      </div>
      <button
        onClick={onReset}
        className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
          isVerified
            ? 'bg-green-100 hover:bg-green-200 text-green-700'
            : 'bg-red-100 hover:bg-red-200 text-red-700'
        }`}
      >
        Reset
      </button>
    </div>
  );
}

// ─── Demo card ────────────────────────────────────────────────────────────────

function DemoCard({
  config,
  status,
  onReset,
}: {
  config: DemoConfig;
  status: VerificationStatus;
  onReset: () => void;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Card header */}
      <div className="border-b border-gray-100 px-6 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{config.title}</h3>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${config.badgeColor}`}
              >
                {config.badge}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-gray-500">{config.description}</p>
          </div>
        </div>
      </div>

      {/* Two-column: live demo + code */}
      <div className="grid gap-0 lg:grid-cols-2">
        {/* Live component */}
        <div className="flex flex-col gap-4 border-b border-gray-100 p-6 lg:border-b-0 lg:border-r">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Live demo</p>

          {status === 'idle' ? (
            <AgeGate {...config.props} />
          ) : (
            <StatusBadge status={status} onReset={onReset} />
          )}
        </div>

        {/* Code snippet */}
        <div className="flex flex-col gap-4 p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Usage</p>
          <CodeBlock code={config.snippet} />
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AgeGateDemoPage() {
  const [statuses, setStatuses] = useState<Record<string, VerificationStatus>>({
    age18: 'idle',
    age21: 'idle',
    age13: 'idle',
    disabled: 'idle',
    custom: 'idle',
  });

  function setStatus(id: string, s: VerificationStatus) {
    setStatuses((prev) => ({ ...prev, [id]: s }));
  }

  function reset(id: string) {
    setStatuses((prev) => ({ ...prev, [id]: 'idle' }));
  }

  const demos = makeDemos(statuses, setStatus);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <a href="/" className="text-sm text-gray-500 hover:text-gray-800">
            ← Back to sandbox
          </a>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* Page header */}
        <div className="mb-12">
          <div className="mb-3 flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              AgeGate Component Demo
            </h1>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              components/AgeGate.tsx
            </span>
          </div>
          <p className="max-w-2xl text-gray-500">
            A fully accessible, configurable age verification form. Accepts a date of birth via
            three dropdowns, validates it against a minimum age using{' '}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm text-gray-800">
              isOfAge()
            </code>
            , and fires a callback on pass or fail. Day options are dynamically constrained per
            month and year — no impossible dates like Feb&nbsp;31.
          </p>
        </div>

        {/* Demo cards */}
        <section className="mb-16 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Configurations</h2>
          {demos.map((config) => (
            <DemoCard
              key={config.id}
              config={config}
              status={statuses[config.id]}
              onReset={() => reset(config.id)}
            />
          ))}
        </section>

        {/* Props table */}
        <section className="mb-16">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Props</h2>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  <th className="px-5 py-3 font-semibold text-gray-700">Prop</th>
                  <th className="px-5 py-3 font-semibold text-gray-700">Type</th>
                  <th className="px-5 py-3 font-semibold text-gray-700">Required</th>
                  <th className="px-5 py-3 font-semibold text-gray-700">Default</th>
                  <th className="px-5 py-3 font-semibold text-gray-700">Description</th>
                </tr>
              </thead>
              <tbody>
                {PROPS_TABLE.map((row, i) => (
                  <tr key={row.name} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="px-5 py-3">
                      <code className="font-mono font-medium text-blue-700">{row.name}</code>
                    </td>
                    <td className="px-5 py-3">
                      <code className="font-mono text-xs text-gray-600">{row.type}</code>
                    </td>
                    <td className="px-5 py-3">
                      {row.required ? (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                          required
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                          optional
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <code className="font-mono text-xs text-gray-500">{row.default}</code>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{row.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Full usage example */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Full example</h2>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-3">
              <span className="font-mono text-xs text-gray-500">app/page.tsx</span>
            </div>
            <div className="p-5">
              <CodeBlock
                code={`'use client';

import { useState } from 'react';
import AgeGate from '@/components/AgeGate';

export default function Page() {
  const [allowed, setAllowed] = useState(false);

  if (!allowed) {
    return (
      <AgeGate
        minAge={18}
        onAgeVerified={() => setAllowed(true)}
        onAgeDenied={() => alert("Access denied")}
        errorMessage="You must be 18+ to view this page."
        submitButtonText="Verify My Age"
      />
    );
  }

  return <ProtectedContent />;
}`}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
