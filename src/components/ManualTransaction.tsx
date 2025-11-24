'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { CREATE_TRANSACTION, GET_ACCOUNTS, GET_CATEGORIES } from '@/lib/graphql/queries';

export default function ManualTransaction() {
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [categoryId, setCategoryId] = useState('');

  const { data: accountsData } = useQuery(GET_ACCOUNTS);
  const { data: categoriesData } = useQuery(GET_CATEGORIES, {
    variables: { type }
  });

  const [createTransaction, { loading }] = useMutation(CREATE_TRANSACTION, {
    refetchQueries: ['GetTransactions', 'GetDashboardStats']
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accountId || !amount || !description) {
      alert('Please fill in all required fields');
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

      // Reset form
      setDescription('');
      setAmount('');
      setCategoryId('');
      alert('Transaction added successfully!');
    } catch (error) {
      console.error('Error creating transaction:', error);
      alert('Failed to create transaction');
    }
  };

  const accounts = accountsData?.accounts || [];
  const categories = categoriesData?.categories || [];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Transaction Type
        </label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="EXPENSE"
              checked={type === 'EXPENSE'}
              onChange={(e) => setType(e.target.value as 'EXPENSE')}
              className="mr-2"
            />
            <span>Expense</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="INCOME"
              checked={type === 'INCOME'}
              onChange={(e) => setType(e.target.value as 'INCOME')}
              className="mr-2"
            />
            <span>Income</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Account *
        </label>
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md"
          required
        >
          <option value="">Select an account</option>
          {accounts.map((account: any) => (
            <option key={account.id} value={account.id}>
              {account.name} - {account.institution}
            </option>
          ))}
        </select>
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
          Description *
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., Grocery shopping at Whole Foods"
          className="w-full p-2 border border-gray-300 rounded-md"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Amount ($) *
        </label>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full p-2 border border-gray-300 rounded-md"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Category (optional)
        </label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md"
        >
          <option value="">Uncategorized</option>
          {categories.map((category: any) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
      >
        {loading ? 'Adding Transaction...' : 'Add Transaction'}
      </button>
    </form>
  );
}