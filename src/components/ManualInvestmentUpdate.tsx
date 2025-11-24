'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { UPDATE_INVESTMENT_VALUE, GET_INVESTMENT_PORTFOLIOS } from '@/lib/graphql/queries';

export default function ManualInvestmentUpdate() {
  const [portfolioId, setPortfolioId] = useState('');
  const [value, setValue] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const { data: portfoliosData } = useQuery(GET_INVESTMENT_PORTFOLIOS);

  const [updateValue, { loading }] = useMutation(UPDATE_INVESTMENT_VALUE, {
    refetchQueries: ['GetInvestmentPortfolios', 'GetDashboardStats']
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!portfolioId || !value) {
      alert('Please fill in all required fields');
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

      // Reset form
      setValue('');
      setNotes('');
      alert('Investment value updated successfully!');
    } catch (error) {
      console.error('Error updating investment:', error);
      alert('Failed to update investment value');
    }
  };

  const portfolios = portfoliosData?.investmentPortfolios || [];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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