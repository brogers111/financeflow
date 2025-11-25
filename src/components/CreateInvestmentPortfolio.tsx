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

  return (
    <div className="max-w-2xl mx-auto p-6 bg-[#EEEBD9] rounded-xl">
      <h2 className="text-2xl font-bold mb-6">Create Investment Portfolio</h2>

      {/* Success Message */}
      {success && (
        <div className="mt-2 p-4 rounded-md">
          <p className="text-green-800 font-medium text-lg text-center mb-4">
            Portfolio created successfully!
          </p>

          <div className="flex gap-4">
            <button
              onClick={resetForm}
              className="w-1/2 mt-3 mx-auto py-2 px-4 rounded-md cursor-pointer border-2 border-green-700 hover:bg-green-100 text-green-700 text-center block"
            >
              Create Another Portfolio
            </button>

            <a
              href="/upload"
              className="w-1/2 mt-3 mx-auto py-2 px-4 rounded-md cursor-pointer bg-black text-white text-center block"
            >
              Add Investment Amounts
            </a>
          </div>
        </div>
      )}

      {/* Form */}
      {!success && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Portfolio Name */}
          <div>
            <label className="block text-md font-medium text-[#282427] mb-2">
              Portfolio Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Roth IRA, 401k, Brokerage"
              className="w-full p-2 border border-[#282427] rounded-lg"
              required
            />
          </div>

          {/* Portfolio Type */}
          <div>
            <label className="block text-md font-medium text-[#282427] mb-2">
              Portfolio Type *
            </label>
            <input
              type="text"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="e.g., 401k, Roth IRA, Brokerage"
              className="w-full p-2 border border-[#282427] rounded-lg"
              required
            />
          </div>

          {/* Institution */}
          <div>
            <label className="block text-md font-medium text-[#282427] mb-2">
              Institution *
            </label>
            <input
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="e.g., Fidelity, Vanguard, Robinhood"
              className="w-full p-2 border border-[#282427] rounded-lg"
              required
            />
          </div>

          {/* Initial Value */}
          <div>
            <label className="block text-md font-medium text-[#282427] mb-2">
              Initial Value ($) (optional)
            </label>
            <input
              type="number"
              step="0.01"
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              placeholder="0.00"
              className="w-full p-2 border border-[#282427] rounded-lg"
            />
            <p className="text-xs text-gray-600 mt-1">
              You can add this later in the Upload tab.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="text-center mb-2">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !name || !type || !institution}
            className="w-full bg-[#282427] text-white py-2 px-4 rounded-lg cursor-pointer disabled:bg-[#d7d5c5] disabled:text-[#282427] disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Portfolio...' : 'Create Portfolio'}
          </button>
        </form>
      )}
    </div>
  );
}
