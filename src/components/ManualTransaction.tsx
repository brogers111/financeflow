'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import Link from 'next/link';
import { CREATE_TRANSACTION, GET_ACCOUNTS, GET_CATEGORIES } from '@/lib/graphql/queries';

export default function ManualTransaction() {
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'INCOME' | 'EXPENSE' | 'TRANSFER'>('EXPENSE');
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { data: accountsData } = useQuery(GET_ACCOUNTS);
  const { data: categoriesData } = useQuery(GET_CATEGORIES, { 
    variables: { type }
  });

  const [createTransaction, { loading }] = useMutation(CREATE_TRANSACTION, {
    refetchQueries: ['GetTransactions', 'GetDashboardStats', 'GetAccounts']
  });

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setCategoryId('');
    setAccountId('');
    setToAccountId('');
    setType('EXPENSE');
    setDate(new Date().toLocaleDateString('en-CA'));
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

    if (type === 'TRANSFER' && !toAccountId) {
      setError('Please select a destination account for the transfer');
      return;
    }

    if (type === 'TRANSFER' && accountId === toAccountId) {
      setError('Cannot transfer to the same account');
      return;
    }

    try {
      if (type === 'TRANSFER') {
        // Create two transactions for a transfer with the same category
        const fromAccountName = accounts.find((a: any) => a.id === accountId)?.name || 'account';
        const toAccountName = accounts.find((a: any) => a.id === toAccountId)?.name || 'account';
        
        // 1. Negative transaction from source account
        await createTransaction({
          variables: {
            input: {
              accountId,
              date: new Date(date).toISOString(),
              description: description || `Transfer to ${toAccountName}`,
              amount: -Math.abs(parseFloat(amount)),
              type: 'TRANSFER',
              categoryId: categoryId || null,
              wasManual: true
            }
          }
        });

        // 2. Positive transaction to destination account
        await createTransaction({
          variables: {
            input: {
              accountId: toAccountId,
              date: new Date(date).toISOString(),
              description: description || `Transfer from ${fromAccountName}`,
              amount: Math.abs(parseFloat(amount)),
              type: 'TRANSFER',
              categoryId: categoryId || null,
              wasManual: true
            }
          }
        });
      } else {
        // Regular income or expense transaction
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
      }

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
      <h2 className="text-2xl font-bold mb-6">Upload Manual Transaction</h2>

      {/* Success Message */}
      {success && (
        <div className="mt-2 p-4 rounded-md">
          <p className="text-green-800 font-medium text-lg text-center mb-4">
            {type === 'TRANSFER' ? 'Transfer completed successfully!' : 'Transaction added successfully!'}
          </p>
          <div className='flex gap-4'>
            <button
              onClick={resetForm}
              className="w-1/2 mt-3 mx-auto py-2 px-4 rounded-md cursor-pointer border-2 border-green-700 hover:bg-green-100 text-green-700 text-center block"
            >
              Upload Another Transaction
            </button>
            <Link href="/transactions" className='w-1/2 mt-3 mx-auto py-2 px-4 rounded-md cursor-pointer bg-black text-white text-center block'>
              View All Transactions
            </Link>
          </div>
        </div>
      )}

      {!success && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Transaction Type + Date Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-start">
            {/* Transaction Type Buttons */}
            <div>
              <label className="block text-md font-medium text-[#282427] mb-2">Transaction Type</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setType('EXPENSE');
                    setCategoryId('');
                  }}
                  className={`flex-1 py-3 rounded-lg border border-[#282427] text-xs cursor-pointer
                    ${type === 'EXPENSE' ? 'bg-[#282427] text-white' : 'bg-transparent text-black'}`}
                >
                  Expense
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setType('INCOME');
                    setCategoryId('');
                  }}
                  className={`flex-1 py-3 rounded-lg border border-[#282427] text-xs cursor-pointer
                    ${type === 'INCOME' ? 'bg-[#282427] text-white' : 'bg-transparent text-black'}`}
                >
                  Income
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setType('TRANSFER');
                    setCategoryId('');
                  }}
                  className={`flex-1 py-3 rounded-lg border border-[#282427] text-xs cursor-pointer
                    ${type === 'TRANSFER' ? 'bg-[#282427] text-white' : 'bg-transparent text-black'}`}
                >
                  Transfer
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

          {/* Account(s) - Changes based on type */}
          {type === 'TRANSFER' ? (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-md font-medium text-[#282427] mb-2">From Account *</label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full p-2 border border-[#282427] rounded-lg cursor-pointer"
                  required
                >
                  <option value="">Select source account</option>
                  {accounts.map((account: any) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-md font-medium text-[#282427] mb-2">To Account *</label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full p-2 border border-[#282427] rounded-lg cursor-pointer"
                  required
                >
                  <option value="">Select destination account</option>
                  {accounts
                    .filter((account: any) => account.id !== accountId)
                    .map((account: any) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          ) : (
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
          )}

          {/* Description */}
          <div>
            <label className="block text-md font-medium text-[#282427] mb-2">Description *</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                type === 'TRANSFER' 
                  ? 'e.g., Monthly savings contribution' 
                  : 'e.g., Ice Cream from Dairy Queen'
              }
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
              <label className="block text-md font-medium text-[#282427] mb-2">
                Category {type === 'TRANSFER' ? '(optional)' : '(optional)'}
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full p-2 border border-[#282427] rounded-lg cursor-pointer"
              >
                <option value="">Uncategorized</option>
                {categories.map((category: any) => (
                  <option key={category.id} value={category.id}>
                    {category.icon ? `${category.icon} ` : ''}{category.name}
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
            disabled={
              loading || 
              !accountId || 
              !amount || 
              !date ||
              !description ||
              (type === 'TRANSFER' && !toAccountId)
            }
            className="w-full bg-[#282427] text-white py-2 px-4 rounded-lg cursor-pointer disabled:bg-[#d7d5c5] disabled:text-[#282427] disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : type === 'TRANSFER' ? 'Complete Transfer' : 'Add Transaction'}
          </button>
        </form>
      )}
    </div>
  );
}