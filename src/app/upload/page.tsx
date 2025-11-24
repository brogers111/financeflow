'use client';

import { useState } from 'react';
import UploadStatement from '@/components/UploadStatement';
import ManualTransaction from '@/components/ManualTransaction';
import ManualInvestmentUpdate from '@/components/ManualInvestmentUpdate';

type UploadMode = 'statement' | 'transaction' | 'investment';

export default function UploadPage() {
  const [mode, setMode] = useState<UploadMode>('statement');

  return (
    <div className="mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Upload Data</h1>

      {/* Mode Selection Buttons */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setMode('statement')}
          className={`flex-1 py-4 px-6 rounded-lg border-2 transition ${
            mode === 'statement'
              ? 'border-blue-600 bg-blue-50 text-blue-700'
              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
          }`}
        >
          <div className="text-2xl mb-2">📄</div>
          <div className="font-semibold">Upload Bank Statement</div>
          <div className="text-sm text-gray-500 mt-1">PDF statements from your bank</div>
        </button>

        <button
          onClick={() => setMode('transaction')}
          className={`flex-1 py-4 px-6 rounded-lg border-2 transition ${
            mode === 'transaction'
              ? 'border-blue-600 bg-blue-50 text-blue-700'
              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
          }`}
        >
          <div className="text-2xl mb-2">💳</div>
          <div className="font-semibold">Add Transaction</div>
          <div className="text-sm text-gray-500 mt-1">Manually enter a single transaction</div>
        </button>

        <button
          onClick={() => setMode('investment')}
          className={`flex-1 py-4 px-6 rounded-lg border-2 transition ${
            mode === 'investment'
              ? 'border-blue-600 bg-blue-50 text-blue-700'
              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
          }`}
        >
          <div className="text-2xl mb-2">📈</div>
          <div className="font-semibold">Update Investment</div>
          <div className="text-sm text-gray-500 mt-1">Add monthly investment value</div>
        </button>
      </div>

      {/* Render Selected Component */}
      <div className="bg-white rounded-lg p-6">
        {mode === 'statement' && <UploadStatement />}
        {mode === 'transaction' && <ManualTransaction />}
        {mode === 'investment' && <ManualInvestmentUpdate />}
      </div>
    </div>
  );
}