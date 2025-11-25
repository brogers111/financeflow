'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import Image from 'next/image';
import { GET_TRANSACTIONS, GET_CATEGORIES, CATEGORIZE_TRANSACTION, DELETE_TRANSACTION } from '@/lib/graphql/queries';

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

export default function TransactionsPage() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; description: string } | null>(null);

  const { data: transactionsData, loading, refetch } = useQuery(GET_TRANSACTIONS);
  const { data: categoriesData } = useQuery(GET_CATEGORIES);
  const [categorizeTransaction, { loading: categorizing }] = useMutation(CATEGORIZE_TRANSACTION);
  const [deleteTransaction, { loading: deleting }] = useMutation(DELETE_TRANSACTION, {
    refetchQueries: ['GetTransactions', 'GetDashboardStats', 'GetAccounts']
  });

  const transactions: Transaction[] = transactionsData?.transactions || [];
  const categories = categoriesData?.categories || [];

  // Filter transactions by selected month/year
  const filteredTransactions = transactions.filter(t => {
    const date = new Date(Number(t.date));
    return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
  });

  const uncategorizedCount = filteredTransactions.filter(t => !t.category).length;

  const handlePreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handleCategoryChange = async (transactionId: string, categoryId: string) => {
    if (!categoryId) return;

    try {
      await categorizeTransaction({
        variables: { id: transactionId, categoryId }
      });

      setEditingTransaction(null);
      setSelectedCategory('');
      await refetch();
    } catch (error) {
      console.error('Categorization error:', error);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await deleteTransaction({
        variables: { id: deleteConfirm.id }
      });

      setDeleteConfirm(null);
      await refetch();
    } catch(error) {
      console.error('Delete error:', error);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading transactions...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        {/* Left: Title + Month Navigation */}
        <h1 className="text-3xl font-bold text-[#EEEBD9]">Transactions</h1>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreviousMonth}
            className="p-2 border-2 border-transparent hover:border-2 hover:border-gray-100 rounded-md transition cursor-pointer"
          >
            <Image src="/chevron-left.svg" alt="Previous Month" width={24} height={24} />
          </button>
          <span className="text-lg font-medium min-w-[180px] text-center text-[#EEEBD9]">
            {monthNames[selectedMonth]} {selectedYear}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-2 border-2 border-transparent hover:border-2 hover:border-gray-100 rounded-md transition cursor-pointer"
            disabled={selectedMonth === currentDate.getMonth() && selectedYear === currentDate.getFullYear()}
          >
            <Image src="/chevron-right.svg" alt="Next Month" width={24} height={24} />
          </button>
        </div>

        {/* Right: Stats */}
        <div className="flex gap-4">
          <p className="px-3 py-2 text-md border-2 border-[#EEEBD9] rounded-md text-[#EEEBD9] font-semibold">
            Total Transactions: {filteredTransactions.length}
          </p>

          <p className="px-3 py-2 text-md border-2 border-[#EEEBD9] rounded-md text-[#EEEBD9] font-semibold">
            Need Categorization: {uncategorizedCount}
          </p>

          <p className="px-3 py-2 text-md border-2 border-[#EEEBD9] rounded-md text-[#EEEBD9] font-semibold">
            Net Income: {filteredTransactions
              .reduce((sum, t) => sum + t.amount, 0)
              .toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
          </p>
      </div>

      </div>

      {/* Transactions Table */}
      <div className="bg-[#EEEBD9] rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#282427]">
            <thead className="bg-[#EEEBD9]">
              <tr>
                <th className='px-6 py-3 text-left text-xs font-semibold text-[#282427] uppercase tracking-wider w-12'>
                  {/* Empty header for delete icon column */}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#282427] uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#282427] uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#282427] uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#282427] uppercase tracking-wider">
                  Account
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-[#282427] uppercase tracking-wider w-64">
                  Category
                </th>
              </tr>
            </thead>

            <tbody className="bg-[#EEEBD9] divide-y divide-[#282427]">
              {filteredTransactions.map((transaction) => {
                const isEditing = editingTransaction === transaction.id;
                const isHovered = hoveredRow === transaction.id;

                return (
                  <tr
                    key={transaction.id}
                    onMouseEnter={() => setHoveredRow(transaction.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    className='hover:bg-[#d7d5c5] transition-colors'
                  >
                    <td className="px-2 py-4 whitespace-nowrap text-sm w-12">
                      {isHovered && (
                        <button
                          onClick={() => setDeleteConfirm({ id: transaction.id, description: transaction.description })}
                          className="p-1 hover:bg-red-100 rounded transition-colors cursor-pointer"
                          title="Delete transaction"
                        >
                          <Image src="/trash.svg" alt="Delete" width={24} height={24} />
                        </button>
                      )}
                    </td>

                    <td className="px-6 py-6 whitespace-nowrap text-sm text-[#282427]">
                      {new Date(Number(transaction.date)).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>

                    <td className="px-6 py-4 text-sm text-[#282427] max-w-xs">
                      <div className="truncate" title={transaction.description}>
                        {transaction.description}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}>
                        {transaction.amount < 0 ? '-' : '+'}${Math.abs(transaction.amount).toFixed(2)}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#282427]">
                      {transaction.account.name}
                    </td>

                    <td className="px-6 py-4 text-sm w-64 text-center">
                      {/* CATEGORY CELL */}
                      {isEditing ? (
                        <select
                          value={selectedCategory || transaction.category?.id || ''}
                          onChange={(e) => handleCategoryChange(transaction.id, e.target.value)}
                          className="w-full border border-gray-300 rounded-full py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#282427] cursor-pointer"
                          autoFocus
                        >
                          <option value="" className='text-center'>Select category...</option>

                          {transaction.type === 'TRANSFER' ? (
                            <>
                              <optgroup label="Expense Categories">
                                {categories
                                  .filter((c: any) => c.type === 'EXPENSE')
                                  .map((category: any) => (
                                    <option key={category.id} value={category.id}>
                                      {category.icon} {category.name}
                                    </option>
                                  ))}
                              </optgroup>

                              <optgroup label="Income Categories">
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
                        <span
                          onClick={() => setEditingTransaction(transaction.id)}
                          className="inline-flex items-center px-3 py-1 my-1 rounded-full text-white text-xs font-medium cursor-pointer"
                          style={{ backgroundColor: transaction.category.color }}
                        >
                          {transaction.category.name}
                        </span>
                      ) : (
                        <span
                          onClick={() => setEditingTransaction(transaction.id)}
                          className="text-[#282427] border border-[#282427] px-3 py-1 rounded-full text-xs cursor-pointer"
                        >
                          Uncategorized
                        </span>
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
            No transactions found for {monthNames[selectedMonth]} {selectedYear}
          </div>
        )}
      </div>
            {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 min-w-sm max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-center">Confirm Transaction Deletion:</h3>
            <p className="text-gray-600 mb-2 font-bold">
              {deleteConfirm.description}
            </p>
            <p className='text-gray-600 mb-4'>
              This action can&apos;t be undone.
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
                onClick={() => setDeleteConfirm(null)}
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