'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { UPDATE_INVESTMENT_VALUE } from '@/lib/graphql/queries';

type Portfolio = {
  id: string;
  name: string;
  type: string;
  institution: string;
  currentValue: number;
  valueHistory: Array<{
    id: string;
    value: number;
    date: string;
    notes?: string;
  }>;
  updatedAt: string;
};

export default function InvestmentScorecard({ 
  portfolio,
  onUpdate
}: { 
  portfolio: Portfolio;
  onUpdate: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const [updateValue, { loading }] = useMutation(UPDATE_INVESTMENT_VALUE);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newValue) {
      alert('Please enter a value');
      return;
    }

    try {
      await updateValue({
        variables: {
          portfolioId: portfolio.id,
          value: parseFloat(newValue),
          date: new Date(date).toISOString(),
          notes: notes || null
        }
      });

      setShowModal(false);
      setNewValue('');
      setNotes('');
      onUpdate(); // Refresh data
    } catch (error) {
      console.error('Error updating investment:', error);
      alert('Failed to update investment value');
    }
  };

  // Calculate change from last snapshot
  const lastSnapshot = portfolio.valueHistory[1]; // Index 0 is current, 1 is previous
  const change = lastSnapshot 
    ? portfolio.currentValue - lastSnapshot.value 
    : 0;
  const changePercent = lastSnapshot 
    ? ((change / lastSnapshot.value) * 100).toFixed(2)
    : '0';

  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow relative">
        {/* Edit Button */}
        <button
          onClick={() => setShowModal(true)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          title="Update value"
        >
          ✏️
        </button>

        <div className="mb-2">
          <p className="text-sm text-gray-600">{portfolio.name}</p>
          <p className="text-xs text-gray-400">{portfolio.institution}</p>
        </div>
        
        <p className="text-2xl font-bold text-gray-900">
          ${portfolio.currentValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </p>
        
        {lastSnapshot && (
          <p className={`text-sm mt-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? '↑' : '↓'} ${Math.abs(change).toLocaleString('en-US', { minimumFractionDigits: 2 })} ({changePercent}%)
          </p>
        )}

        <p className="text-xs text-gray-400 mt-2">
          Last updated: {new Date(portfolio.updatedAt).toLocaleDateString()}
        </p>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Update {portfolio.name}
            </h3>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Current Value ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder={portfolio.currentValue.toString()}
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Monthly contribution"
                  className="w-full p-2 border rounded-md"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}