const features: { name: string; path: string; description: string }[] = [
  // Add feature demos here as you build them:
  // { name: 'My Feature', path: '/features/my-feature', description: 'What it does' },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <div className="mx-auto max-w-4xl px-6 py-20">
        {/* Header */}
        <div className="mb-16">
          <h1 className="mb-3 text-4xl font-bold tracking-tight">Dev Sandbox</h1>
          <p className="text-lg text-gray-400">
            A feature lab for building and testing isolated demos in a production-grade environment.
          </p>
        </div>

        {/* Quality gates */}
        <div className="mb-16">
          <h2 className="mb-6 text-xs font-semibold uppercase tracking-widest text-gray-500">
            Quality Gates
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Editor', detail: 'ESLint + Prettier' },
              { label: 'Commit', detail: 'Husky + lint-staged' },
              { label: 'CI', detail: 'GitHub Actions' },
            ].map(({ label, detail }) => (
              <div key={label} className="rounded-lg border border-gray-800 bg-gray-900 p-4">
                <div className="mb-1 text-sm font-medium text-gray-200">{label}</div>
                <div className="text-xs text-gray-500">{detail}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature demos */}
        <div className="mb-16">
          <h2 className="mb-6 text-xs font-semibold uppercase tracking-widest text-gray-500">
            Feature Demos
          </h2>
          {features.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-800 p-10 text-center">
              <p className="mb-2 text-sm text-gray-500">No feature demos yet.</p>
              <p className="text-xs text-gray-600">
                Add one at{' '}
                <code className="rounded bg-gray-800 px-1 py-0.5 text-gray-400">
                  app/features/your-feature/page.tsx
                </code>
              </p>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {features.map(({ name, path, description }) => (
                <li key={path}>
                  <a
                    href={path}
                    className="block rounded-lg border border-gray-800 bg-gray-900 p-5 transition-colors hover:border-gray-700 hover:bg-gray-800"
                  >
                    <div className="mb-1 font-medium text-gray-100">{name}</div>
                    <div className="text-sm text-gray-500">{description}</div>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick commands */}
        <div>
          <h2 className="mb-6 text-xs font-semibold uppercase tracking-widest text-gray-500">
            Quick Commands
          </h2>
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-6 font-mono text-sm">
            {[
              ['npm run dev', 'Start dev server'],
              ['npm run lint', 'Run ESLint'],
              ['npm run format', 'Run Prettier'],
              ['npm test', 'Run tests'],
              ['npm run build', 'Production build'],
            ].map(([cmd, desc]) => (
              <div key={cmd} className="flex items-baseline gap-4 py-1">
                <span className="text-blue-400">{cmd}</span>
                <span className="text-gray-600">— {desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
