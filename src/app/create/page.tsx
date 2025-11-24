'use client';

import { useState } from 'react';
import CreateAccount from '@/components/CreateAccount';
import CreateInvestmentPortfolio from '@/components/CreateInvestmentPortfolio';

type CreateMode = 'account' | 'investment';

export default function CreatePage() {
  const [mode, setMode] = useState<CreateMode>('account');

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Accounts</h1>
      <p className="text-gray-600 mb-8">Set up new bank accounts and investment portfolios</p>

      {/* Mode Selection Buttons */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setMode('account')}
          className={`flex-1 py-4 px-6 rounded-lg border-2 transition ${
            mode === 'account'
              ? 'border-blue-600 bg-blue-50 text-blue-700'
              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
          }`}
        >
          <div className="text-2xl mb-2">🏦</div>
          <div className="font-semibold">Create Bank Account</div>
          <div className="text-sm text-gray-500 mt-1">Checking, savings, credit cards</div>
        </button>

        <button
          onClick={() => setMode('investment')}
          className={`flex-1 py-4 px-6 rounded-lg border-2 transition ${
            mode === 'investment'
              ? 'border-blue-600 bg-blue-50 text-blue-700'
              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
          }`}
        >
          <div className="text-2xl mb-2">📊</div>
          <div className="font-semibold">Create Investment Portfolio</div>
          <div className="text-sm text-gray-500 mt-1">401k, IRA, brokerage accounts</div>
        </button>
      </div>

      {/* Render Selected Component */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        {mode === 'account' && <CreateAccount />}
        {mode === 'investment' && <CreateInvestmentPortfolio />}
      </div>
    </div>
  );
}