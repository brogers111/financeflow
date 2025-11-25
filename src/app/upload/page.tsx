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
      <div className='flex justify-between'>
        <h1 className="text-3xl font-bold text-[#EEEBD9]">Upload</h1>

        {/* Mode Selection Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => setMode('statement')}
            className={`py-2 px-3 cursor-pointer transition rounded-lg border-2
              ${mode === 'statement'
                ? 'border-[#EEEBD9]'
                : 'border-transparent hover:border-gray-700'
              }
            `}>
            <div className="font-semibold text-[#EEEBD9]">Upload Bank Statement</div>
          </button>

          <button
            onClick={() => setMode('transaction')}
            className={`py-2 px-3 cursor-pointer transition rounded-lg border-2
              ${mode === 'transaction'
                ? 'border-[#EEEBD9]'
                : 'border-transparent hover:border-gray-700'
              }
            `}>
            <div className="font-semibold text-[#EEEBD9]">Upload Transaction</div>
          </button>

          <button
            onClick={() => setMode('investment')}
            className={`py-2 px-3 cursor-pointer transition rounded-lg border-2
              ${mode === 'investment'
                ? 'border-[#EEEBD9]'
                : 'border-transparent hover:border-gray-700'
              }
            `}>
            <div className="font-semibold text-[#EEEBD9]">Upload Investment Amount</div>
          </button>
        </div>
      </div>

      {/* Render Selected Component */}
      <div className="rounded-lg p-6">
        {mode === 'statement' && <UploadStatement />}
        {mode === 'transaction' && <ManualTransaction />}
        {mode === 'investment' && <ManualInvestmentUpdate />}
      </div>
    </div>
  );
}