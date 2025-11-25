'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import Link from 'next/link';
import { UPDATE_INVESTMENT_VALUE, GET_INVESTMENT_PORTFOLIOS } from '@/lib/graphql/queries';

export default function ManualInvestmentUpdate() {
  const [portfolioId, setPortfolioId] = useState('');
  const [value, setValue] = useState('');
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
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
    setDate(new Date().toLocaleDateString('en-CA'));
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
  console.log('Portfolios:', portfolios);

  return (
    <div className="max-w-2xl mx-auto p-6 bg-[#EEEBD9] rounded-xl">
      <h2 className="text-2xl font-bold mb-6">Upload Investment Amount</h2>

      {/* Success Message */}
      {success && (
        <div className="mt-2 p-4 rounded-md">
          <p className="text-green-800 font-medium text-lg text-center mb-4">Investment value added successfully!</p>
          <div className='flex gap-4'>
            <button
              onClick={resetForm}
              className="w-1/2 mt-3 mx-auto py-2 px-4 rounded-md cursor-pointer border-2 border-green-700 hover:bg-green-100 text-green-700 text-center block"
            >
              Update Another Investment
            </button>
            <Link href="/" className='w-1/2 mt-3 mx-auto py-2 px-4 rounded-md cursor-pointer bg-black text-white text-center block'>View Dashboard</Link>
          </div>
        </div>
      )}

      {!success && (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
        <div>
            <label className="block text-md font-medium text-[#282427] mb-2">
            Investment Portfolio *
            </label>
            <select
            value={portfolioId}
            onChange={(e) => setPortfolioId(e.target.value)}
            className="w-full p-2 border border-[#282427] rounded-md cursor-pointer"
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
            <p className="text-sm text-gray-400 mt-2">
                No investment portfolios found. Create one in the <strong>Create</strong> tab first.
            </p>
            )}
        </div>

        <div>
            <label className="block text-md font-medium text-[#282427] mb-2">
            Date *
            </label>
            <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full p-2 border border-[#282427] rounded-md cursor-pointer"
            required
            />
        </div>

        <div>
            <label className="block text-md font-medium text-[#282427] mb-2">
            Current Value ($) *
            </label>
            <input
            type="number"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0.00"
            className="w-full p-2 border border-[#282427] rounded-md"
            required
            />
        </div>

        {error && (
            <div className="text-center mb-2">
            <p className="text-red-800 text-sm">{error}</p>
            </div>
        )}

        <button
            type="submit"
            disabled={loading || portfolios.length === 0 || !value }
            className="w-full bg-[#282427] text-white py-2 px-4 rounded-lg cursor-pointer disabled:bg-[#d7d5c5] disabled:text-[#282427] disabled:cursor-not-allowed"
        >
            {loading ? 'Updating...' : 'Update Investment Value'}
        </button>
        </form>
      )}
    </div>
  );
}