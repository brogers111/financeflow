'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import Link from 'next/link';
import { CREATE_TRANSACTION, GET_ACCOUNTS, GET_CATEGORIES } from '@/lib/graphql/queries';

export default function ManualTransaction() {
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { data: accountsData } = useQuery(GET_ACCOUNTS);
  const { data: categoriesData } = useQuery(GET_CATEGORIES, { variables: { type } });

  const [createTransaction, { loading }] = useMutation(CREATE_TRANSACTION, {
    refetchQueries: ['GetTransactions', 'GetDashboardStats']
  });

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setCategoryId('');
    setAccountId('');
    setType('EXPENSE');
    setDate(new Date().toISOString().split('T')[0]);
    setError('');
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!accountId || !amount || !description) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      await createTransaction({
        variables: {
          input: {
            accountId,
            date: new Date(date).toISOString(),
            description,
            amount: type === 'EXPENSE' ? -Math.abs(parseFloat(amount)) : Math.abs(parseFloat(amount)),
            type,
            categoryId: categoryId || null,
            wasManual: true
          }
        }
      });

      setSuccess(true);
    } catch (err: any) {
      console.error('Error creating transaction:', err);
      setError(err.message || 'Failed to create transaction');
    }
  };

  const accounts = accountsData?.accounts || [];
  const categories = categoriesData?.categories || [];

  return (
    <div className="max-w-2xl mx-auto p-6 bg-[#EEEBD9] rounded-xl">
      <h2 className="text-2xl font-bold mb-6">Add Manual Transaction</h2>

      {/* Success Message */}
      {success && (
        <div className="mt-2 p-4 rounded-md">
          <p className="text-green-800 font-medium text-lg text-center mb-4">Transaction added successfully!</p>
          <div className='flex gap-4'>
            <button
              onClick={resetForm}
              className="w-1/2 mt-3 mx-auto py-2 px-4 rounded-md cursor-pointer border-2 border-green-700 hover:bg-green-100 text-green-700 text-center block"
            >
              Upload Another Transaction
            </button>
            <Link href="/transactions" className='w-1/2 mt-3 mx-auto py-2 px-4 rounded-md cursor-pointer bg-black text-white text-center block'>View All Transactions</Link>
          </div>
        </div>
      )}

      {!success && (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Transaction Type + Date Row */}
            <div className="grid grid-cols-2 gap-6 items-start">
            {/* Transaction Type Buttons */}
            <div>
                <label className="block text-md font-medium text-[#282427] mb-2">Transaction Type</label>
                <div className="flex gap-3">
                <button
                    type="button"
                    onClick={() => setType('EXPENSE')}
                    className={`w-full py-2 rounded-lg border border-[#282427] text-sm cursor-pointer
                    ${type === 'EXPENSE' ? 'bg-[#282427] text-white' : 'bg-transparent text-black'}`}
                >
                    Expense
                </button>

                <button
                    type="button"
                    onClick={() => setType('INCOME')}
                    className={`w-full py-2 rounded-lg border border-[#282427] text-sm cursor-pointer
                    ${type === 'INCOME' ? 'bg-[#282427] text-white' : 'bg-transparent text-black'}`}
                >
                    Income
                </button>
                </div>
            </div>

            {/* Date Input */}
            <div>
                <label className="block text-md font-medium text-gray-700 mb-2">Date *</label>
                <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2 border border-[#282427] rounded-lg cursor-pointer"
                required
                />
            </div>
            </div>

            {/* Account */}
            <div>
            <label className="block text-md font-medium text-[#282427] mb-2">Account *</label>
            <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full p-2 border border-[#282427] rounded-lg cursor-pointer"
                required
            >
                <option value="">Select an account</option>
                {accounts.map((account: any) => (
                <option key={account.id} value={account.id}>
                    {account.name}
                </option>
                ))}
            </select>
            </div>

            {/* Description */}
            <div>
            <label className="block text-md font-medium text-[#282427] mb-2">Description *</label>
            <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Grocery shopping at Whole Foods"
                className="w-full p-2 border border-[#282427] rounded-lg"
                required
            />
            </div>

            {/* Amount + Category in 2 Columns */}
            <div className="grid grid-cols-2 gap-6">
            <div>
                <label className="block text-md font-medium text-[#282427] mb-2">Amount ($) *</label>
                <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full p-2 border border-[#282427] rounded-lg"
                required
                />
            </div>

            <div>
                <label className="block text-md font-medium text-[#282427] mb-2">Category (optional)</label>
                <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full p-2 border border-[#282427] rounded-lg"
                >
                <option value="">Uncategorized</option>
                {categories.map((category: any) => (
                    <option key={category.id} value={category.id}>
                    {category.name}
                    </option>
                ))}
                </select>
            </div>
            </div>

            {/* Error */}
            {error && (
            <div className="text-center mb-2">
                <p className="text-red-800 text-sm">{error}</p>
            </div>
            )}

            {/* Submit */}
            <button
            type="submit"
            disabled={loading || !accountId || !amount || !description || !date }
            className="w-full bg-[#282427] text-white py-2 px-4 rounded-lg cursor-pointer disabled:bg-[#d7d5c5] disabled:text-[#282427] disabled:cursor-not-allowed"
            >
            {loading ? 'Adding Transaction...' : 'Add Transaction'}
            </button>
        </form>
      )}
    </div>
  );
}