'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_TRANSACTIONS, GET_CATEGORIES, CATEGORIZE_TRANSACTION } from '@/lib/graphql/queries';

type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: string;
  category?: {
    id: string;
    name: string;
    color: string;
  };
  account: {
    name: string;
  };
  wasManual: boolean;
  confidence?: number;
};

export default function TransactionReview() {
  const [filter, setFilter] = useState<'all' | 'uncategorized' | 'ai-categorized'>('all');
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const { data: transactionsData, loading, refetch } = useQuery(GET_TRANSACTIONS);
  const { data: categoriesData } = useQuery(GET_CATEGORIES);
  const [categorizeTransaction, { loading: categorizing }] = useMutation(CATEGORIZE_TRANSACTION);

  const transactions: Transaction[] = transactionsData?.transactions || [];
  const categories = categoriesData?.categories || [];

  // Filter transactions based on selected filter
  const filteredTransactions = transactions.filter(t => {
    if (filter === 'uncategorized') return !t.category;
    if (filter === 'ai-categorized') return t.category && !t.wasManual;
    return true;
  });

  const handleStartEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction.id);
    setSelectedCategory(transaction.category?.id || '');
  };

  const handleCancelEdit = () => {
    setEditingTransaction(null);
    setSelectedCategory('');
  };

  const handleSaveCategory = async (transactionId: string) => {
    if (!selectedCategory) {
      alert('Please select a category');
      return;
    }

    try {
      await categorizeTransaction({
        variables: { id: transactionId, categoryId: selectedCategory }
      });

      setEditingTransaction(null);
      setSelectedCategory('');
      await refetch();

    } catch (error) {
      console.error('Categorization error:', error);
      alert('Failed to categorize transaction');
    }
  };

  const getConfidenceBadge = (confidence?: number) => {
    if (!confidence) return null;
    
    const color = confidence > 0.8 ? 'bg-green-100 text-green-800' :
                  confidence > 0.6 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800';
    
    return (
      <span className={`text-xs px-2 py-1 rounded ${color}`}>
        AI: {Math.round(confidence * 100)}%
      </span>
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-gray-600">Loading transactions...</div>
    </div>
  );

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Review & Categorize Transactions
        </h1>
        
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('uncategorized')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === 'uncategorized'
                ? 'bg-orange-500 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Uncategorized ({transactions.filter(t => !t.category).length})
          </button>
          <button
            onClick={() => setFilter('ai-categorized')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === 'ai-categorized'
                ? 'bg-purple-500 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            AI Categorized ({transactions.filter(t => t.category && !t.wasManual).length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === 'all'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            All ({transactions.length})
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-600 mb-1">Total Transactions</p>
            <p className="text-3xl font-bold text-gray-900">{transactions.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-600 mb-1">Need Categorization</p>
            <p className="text-3xl font-bold text-orange-500">
              {transactions.filter(t => !t.category).length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-600 mb-1">AI Categorized</p>
            <p className="text-3xl font-bold text-purple-500">
              {transactions.filter(t => t.category && !t.wasManual).length}
            </p>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => {
                  const isEditing = editingTransaction === transaction.id;
                  
                  return (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(Number(transaction.date)).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                        <div className="truncate" title={transaction.description}>
                          {transaction.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}>
                          {transaction.amount < 0 ? '-' : '+'}${Math.abs(transaction.amount).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.account.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {isEditing ? (
                          <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                            <option value="">Select category...</option>
                            {/* Group categories by type */}
                            {transaction.type === 'TRANSFER' ? (
                                <>
                                <optgroup label="📤 Expense Categories">
                                    {categories
                                    .filter((c: any) => c.type === 'EXPENSE')
                                    .map((category: any) => (
                                        <option key={category.id} value={category.id}>
                                        {category.icon} {category.name}
                                        </option>
                                    ))}
                                </optgroup>
                                <optgroup label="📥 Income Categories">
                                    {categories
                                    .filter((c: any) => c.type === 'INCOME')
                                    .map((category: any) => (
                                        <option key={category.id} value={category.id}>
                                        {category.icon} {category.name}
                                        </option>
                                    ))}
                                </optgroup>
                                </>
                            ) : (
                                /* For INCOME/EXPENSE, only show matching type */
                                categories
                                .filter((c: any) => c.type === transaction.type)
                                .map((category: any) => (
                                    <option key={category.id} value={category.id}>
                                    {category.icon} {category.name}
                                    </option>
                                ))
                            )}
                            </select>
                        ) : transaction.category ? (
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-flex items-center px-3 py-1 rounded-full text-white text-xs font-medium"
                              style={{ backgroundColor: transaction.category.color }}
                            >
                              {transaction.category.name}
                            </span>
                            {!transaction.wasManual && getConfidenceBadge(transaction.confidence)}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm italic">Uncategorized</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveCategory(transaction.id)}
                              disabled={categorizing || !selectedCategory}
                              className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                              {categorizing ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              disabled={categorizing}
                              className="bg-gray-200 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(transaction)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            {transaction.category ? 'Update' : 'Categorize'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredTransactions.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {filter === 'uncategorized' 
                ? '🎉 All transactions are categorized!'
                : filter === 'ai-categorized'
                ? 'No AI-categorized transactions yet'
                : 'No transactions found'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}