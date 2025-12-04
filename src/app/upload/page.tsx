'use client';

import { useState } from 'react';
import UploadStatement from '@/components/UploadStatement';
import ManualTransaction from '@/components/ManualTransaction';
import ManualInvestmentUpdate from '@/components/ManualInvestmentUpdate';

type UploadMode = 'statement' | 'transaction' | 'investment';

export default function UploadPage() {
  const [mode, setMode] = useState<UploadMode | null>(() => {
    // On desktop (md breakpoint is 768px), default to showing the first component
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      return 'statement';
    }
    return null;
  });

  return (
    <div className="mx-auto p-4 md:p-6 pb-24 md:pb-6">
      {/* Desktop: Header with buttons on the side */}
      <div className="hidden md:flex justify-between mb-6">
        <h1 className="text-3xl font-bold text-[#EEEBD9]">Upload</h1>

        {/* Mode Selection Buttons - Desktop */}
        <div className="flex gap-4">
          <button
            onClick={() => setMode('statement')}
            className={`py-2 px-3 cursor-pointer transition rounded-lg border-2
              ${mode === 'statement'
                ? 'border-[#EEEBD9]'
                : 'border-transparent hover:border-gray-700'
              }
            `}>
            <div className="font-semibold text-[#EEEBD9]">Bank Statement</div>
          </button>

          <button
            onClick={() => setMode('transaction')}
            className={`py-2 px-3 cursor-pointer transition rounded-lg border-2
              ${mode === 'transaction'
                ? 'border-[#EEEBD9]'
                : 'border-transparent hover:border-gray-700'
              }
            `}>
            <div className="font-semibold text-[#EEEBD9]">Manual Transaction</div>
          </button>

          <button
            onClick={() => setMode('investment')}
            className={`py-2 px-3 cursor-pointer transition rounded-lg border-2
              ${mode === 'investment'
                ? 'border-[#EEEBD9]'
                : 'border-transparent hover:border-gray-700'
              }
            `}>
            <div className="font-semibold text-[#EEEBD9]">Investment Amount</div>
          </button>
        </div>
      </div>

      {/* Mobile: Selection screen or form with back button */}
      {!mode ? (
        <div className="md:hidden">
          <h1 className="text-2xl font-bold text-[#EEEBD9] mb-10 text-start">Upload</h1>

          <div className="flex flex-col gap-3 max-w-sm mx-auto">
            <button
              onClick={() => setMode('statement')}
              className="py-3 px-4 cursor-pointer transition rounded-lg border-2 border-[#EEEBD9] hover:bg-[#EEEBD9] hover:text-[#282427]"
            >
              <div className="font-semibold text-[#EEEBD9]">Upload Bank Statement</div>
            </button>

            <button
              onClick={() => setMode('transaction')}
              className="py-3 px-4 cursor-pointer transition rounded-lg border-2 border-[#EEEBD9] hover:bg-[#EEEBD9] hover:text-[#282427]"
            >
              <div className="font-semibold text-[#EEEBD9]">Upload Manual Transaction</div>
            </button>

            <button
              onClick={() => setMode('investment')}
              className="py-3 px-4 cursor-pointer transition rounded-lg border-2 border-[#EEEBD9] hover:bg-[#EEEBD9] hover:text-[#282427]"
            >
              <div className="font-semibold text-[#EEEBD9]">Update Investment Amount</div>
            </button>
          </div>
        </div>
      ) : (
        <div className="md:hidden">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setMode(null)}
              className="text-[#EEEBD9] hover:text-white transition cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <h2 className="text-2xl font-bold text-[#EEEBD9]">Upload</h2>
          </div>
        </div>
      )}

      {/* Render Selected Component */}
      <div className="rounded-lg p-0 md:p-6">
        <div className="mx-4 mt-10 md:mx-0">
          {mode === 'statement' && <UploadStatement />}
          {mode === 'transaction' && <ManualTransaction />}
          {mode === 'investment' && <ManualInvestmentUpdate />}
        </div>
      </div>
    </div>
  );
}