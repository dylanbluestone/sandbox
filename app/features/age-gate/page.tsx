'use client';

import { useState } from 'react';

import AgeGate from '@/components/AgeGate';

type Status = 'idle' | 'verified' | 'denied';

export default function AgeGateDemo() {
  const [status, setStatus] = useState<Status>('idle');

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-20 text-gray-100">
      <div className="mx-auto max-w-lg">
        <div className="mb-10">
          <a href="/" className="text-sm text-gray-500 hover:text-gray-300">
            ← Back
          </a>
          <h1 className="mt-4 text-3xl font-bold">Age Gate Demo</h1>
          <p className="mt-2 text-gray-400">
            Configurable age verification form. Requires 18+ by default.
          </p>
        </div>

        {status === 'idle' && (
          <div className="flex justify-center">
            <AgeGate
              minAge={18}
              onAgeVerified={() => setStatus('verified')}
              onAgeDenied={() => setStatus('denied')}
            />
          </div>
        )}

        {status === 'verified' && (
          <div className="rounded-2xl border border-green-800 bg-green-950 p-8 text-center">
            <p className="text-lg font-semibold text-green-400">Age verified.</p>
            <p className="mt-1 text-sm text-green-700">You meet the minimum age requirement.</p>
            <button
              onClick={() => setStatus('idle')}
              className="mt-6 rounded-lg bg-green-800 px-4 py-2 text-sm text-green-100 hover:bg-green-700"
            >
              Reset
            </button>
          </div>
        )}

        {status === 'denied' && (
          <div className="rounded-2xl border border-red-800 bg-red-950 p-8 text-center">
            <p className="text-lg font-semibold text-red-400">Access denied.</p>
            <p className="mt-1 text-sm text-red-700">
              You do not meet the minimum age requirement.
            </p>
            <button
              onClick={() => setStatus('idle')}
              className="mt-6 rounded-lg bg-red-800 px-4 py-2 text-sm text-red-100 hover:bg-red-700"
            >
              Reset
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
