'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { CREATE_INVESTMENT_PORTFOLIO } from '@/lib/graphql/queries';

export default function CreateInvestmentPortfolio() {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [institution, setInstitution] = useState('');
  const [currentValue, setCurrentValue] = useState('');

  const [createPortfolio, { loading }] = useMutation(CREATE_INVESTMENT_PORTFOLIO, {
    refetchQueries: ['GetInvestmentPortfolios']
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createPortfolio({
        variables: {
          name,
          type,
          institution,
          currentValue: parseFloat(currentValue) || 0
        }
      });

      // Reset form
      setName('');
      setType('');
      setInstitution('');
      setCurrentValue('');
      alert('Investment portfolio created successfully!');
    } catch (error) {
      console.error('Error creating portfolio:', error);
      alert('Failed to create portfolio');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Portfolio Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Roth IRA, 401k, Brokerage"
          className="w-full p-2 border border-gray-300 rounded-md"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Portfolio Type *
        </label>
        <input
          type="text"
          value={type}
          onChange={(e) => setType(e.target.value)}
          placeholder="e.g., 401k, Roth IRA, Taxable Brokerage"
          className="w-full p-2 border border-gray-300 rounded-md"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Institution *
        </label>
        <input
          type="text"
          value={institution}
          onChange={(e) => setInstitution(e.target.value)}
          placeholder="e.g., Fidelity, Vanguard, Robinhood"
          className="w-full p-2 border border-gray-300 rounded-md"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Initial Value ($) (optional)
        </label>
        <input
          type="number"
          step="0.01"
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          placeholder="0.00"
          className="w-full p-2 border border-gray-300 rounded-md"
        />
        <p className="text-xs text-gray-500 mt-1">
          You can add this later in the Upload tab
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
      >
        {loading ? 'Creating Portfolio...' : 'Create Portfolio'}
      </button>
    </form>
  );
}