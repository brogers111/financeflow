'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { CREATE_INVESTMENT_PORTFOLIO } from '@/lib/graphql/queries';

export default function CreateInvestmentPortfolio() {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [institution, setInstitution] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [createPortfolio, { loading }] = useMutation(CREATE_INVESTMENT_PORTFOLIO, {
    refetchQueries: ['GetInvestmentPortfolios']
  });

  const resetForm = () => {
    setName('');
    setType('');
    setInstitution('');
    setCurrentValue('');
    setError('');
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await createPortfolio({
        variables: {
          name,
          type,
          institution,
          currentValue: parseFloat(currentValue) || 0
        }
      });

      setSuccess(true);
    } catch (err: any) {
      console.error('Error creating portfolio:', err);
      setError(err.message || 'Failed to create portfolio');
    }
  };

  if (success) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-md">
        <p className="text-green-800 font-medium">
          ✅ Investment portfolio created successfully!
        </p>
        <button
          onClick={resetForm}
          className="mt-3 text-green-700 underline hover:text-green-900"
        >
          Create another portfolio
        </button>
      </div>
    );
  }

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

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

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