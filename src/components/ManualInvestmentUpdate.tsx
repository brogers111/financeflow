'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { UPDATE_INVESTMENT_VALUE, GET_INVESTMENT_PORTFOLIOS } from '@/lib/graphql/queries';

export default function ManualInvestmentUpdate() {
  const [portfolioId, setPortfolioId] = useState('');
  const [value, setValue] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { data: portfoliosData } = useQuery(GET_INVESTMENT_PORTFOLIOS);

  const [updateValue, { loading }] = useMutation(UPDATE_INVESTMENT_VALUE, {
    refetchQueries: ['GetInvestmentPortfolios', 'GetDashboardStats']
  });

  const resetForm = () => {
    setPortfolioId('');
    setValue('');
    setNotes('');
    setDate(new Date().toISOString().split('T')[0]);
    setError('');
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!portfolioId || !value) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      await updateValue({
        variables: {
          portfolioId,
          value: parseFloat(value),
          date: new Date(date).toISOString(),
          notes: notes || null
        }
      });

      setSuccess(true);
    } catch (err: any) {
      console.error('Error updating investment:', err);
      setError(err.message || 'Failed to update investment value');
    }
  };

  const portfolios = portfoliosData?.investmentPortfolios || [];

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-800 font-medium">
            ✅ Investment value updated successfully!
          </p>
          <button
            onClick={resetForm}
            className="mt-3 text-green-700 underline hover:text-green-900"
          >
            Update another investment
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Investment Portfolio *
        </label>
        <select
          value={portfolioId}
          onChange={(e) => setPortfolioId(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md"
          required
        >
          <option value="">Select a portfolio</option>
          {portfolios.map((portfolio: any) => (
            <option key={portfolio.id} value={portfolio.id}>
              {portfolio.name} - {portfolio.institution}
            </option>
          ))}
        </select>
        {portfolios.length === 0 && (
          <p className="text-sm text-gray-500 mt-2">
            No investment portfolios found. Create one in the <strong>Create</strong> tab first.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Date *
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Current Value ($) *
        </label>
        <input
          type="number"
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0.00"
          className="w-full p-2 border border-gray-300 rounded-md"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notes (optional)
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g., End of month snapshot, Monthly contribution"
          className="w-full p-2 border border-gray-300 rounded-md"
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || portfolios.length === 0}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
      >
        {loading ? 'Updating...' : 'Update Investment Value'}
      </button>
    </form>
  );
}