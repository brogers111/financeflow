'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_INVESTMENT_PORTFOLIOS, UPDATE_INVESTMENT_PORTFOLIO, DELETE_INVESTMENT_PORTFOLIO } from '@/lib/graphql/queries';

export default function EditInvestmentPortfolio() {
  const [selectedPortfolioId, setSelectedPortfolioId] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [institution, setInstitution] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: portfoliosData, refetch } = useQuery(GET_INVESTMENT_PORTFOLIOS);
  const [updatePortfolio, { loading: updating }] = useMutation(UPDATE_INVESTMENT_PORTFOLIO, {
    refetchQueries: ['GetInvestmentPortfolios', 'GetDashboardStats']
  });
  const [deletePortfolio, { loading: deleting }] = useMutation(DELETE_INVESTMENT_PORTFOLIO, {
    refetchQueries: ['GetInvestmentPortfolios', 'GetDashboardStats']
  });

  const portfolios = portfoliosData?.investmentPortfolios || [];

  const handlePortfolioSelect = (portfolioId: string) => {
    const portfolio = portfolios.find((p: any) => p.id === portfolioId);
    if (portfolio) {
      setSelectedPortfolioId(portfolioId);
      setName(portfolio.name);
      setType(portfolio.type);
      setInstitution(portfolio.institution);
      setError('');
      setSuccess('');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await updatePortfolio({
        variables: {
          id: selectedPortfolioId,
          input: {
            name,
            type,
            institution
          }
        }
      });

      setSuccess('Portfolio updated successfully!');
      await refetch();
    } catch (err: any) {
      console.error('Error updating portfolio:', err);
      setError(err.message || 'Failed to update portfolio');
    }
  };

  const handleDelete = async () => {
    setError('');
    setSuccess('');

    try {
      await deletePortfolio({
        variables: { id: selectedPortfolioId }
      });

      setSuccess('Portfolio deleted successfully!');
      setSelectedPortfolioId('');
      setName('');
      setType('');
      setInstitution('');
      setShowDeleteConfirm(false);
      await refetch();
    } catch (err: any) {
      console.error('Error deleting portfolio:', err);
      setError(err.message || 'Failed to delete portfolio');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-[#EEEBD9] rounded-xl">
      <h2 className="text-2xl font-bold mb-6">Edit Investment Portfolio</h2>

      {/* Portfolio Selection */}
      <div className="mb-6">
        <label className="block text-md font-medium text-[#282427] mb-2">
          Select Portfolio
        </label>
        <select
          value={selectedPortfolioId}
          onChange={(e) => handlePortfolioSelect(e.target.value)}
          className="w-full p-2 border border-[#282427] rounded-lg cursor-pointer"
        >
          <option value="">Choose a portfolio to edit...</option>
          {portfolios.map((portfolio: any) => (
            <option key={portfolio.id} value={portfolio.id}>
              {portfolio.name} - {portfolio.institution}
            </option>
          ))}
        </select>
      </div>

      {selectedPortfolioId && (
        <form onSubmit={handleUpdate} className="space-y-6">
          {/* Portfolio Name */}
          <div>
            <label className="block text-md font-medium text-[#282427] mb-2">
              Portfolio Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              className="w-full p-2 border border-[#282427] rounded-lg"
              required
            />
          </div>

          {/* Success Message */}
          {success && (
            <div className="text-center">
              <p className="text-green-800 text-sm">{success}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="text-center">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={updating || !name || !institution || !type }
              className="flex-1 bg-[#282427] text-white py-2 px-4 rounded-lg cursor-pointer disabled:bg-[#d7d5c5] disabled:text-[#282427] disabled:cursor-not-allowed"
            >
              {updating ? 'Updating...' : 'Update Portfolio'}
            </button>

            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleting}
              className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg cursor-pointer hover:bg-red-700 disabled:bg-gray-400"
            >
              Delete Portfolio
            </button>
          </div>
        </form>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 min-w-sm max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-center">Confirm Portfolio Deletion:</h3>
            <p className="text-gray-600 mb-2 font-bold">
              {name}
            </p>
            <p className='text-gray-600 mb-4'>
              This action cannot be undone and will delete all value history.
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:bg-gray-400 cursor-pointer"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}